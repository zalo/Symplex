import { Worker } from 'worker_threads';
import { SympyEngine, SympyResult } from './types';

interface PendingRequest {
	resolve: (result: SympyResult) => void;
	reject: (error: Error) => void;
	timer: NodeJS.Timeout;
}

/**
 * Base class for engines that run SymPy on a worker thread (Pyodide and
 * Brython). Evaluations off the extension-host thread can't freeze the
 * editor; a wedged evaluation is cancelled by terminating the worker, and
 * an idle worker is shut down to reclaim its memory.
 */
export abstract class WorkerEngine implements SympyEngine {
	private worker: Worker | undefined;
	private nextRequestId = 1;
	private pending = new Map<number, PendingRequest>();
	private idleTimer: NodeJS.Timeout | undefined;

	/** idleShutdownMs: reclaim the runtime's memory after this much
	 *  inactivity; the next evaluate() transparently restarts it. */
	constructor(private idleShutdownMs: number = 5 * 60 * 1000) { }

	/** Path of the compiled worker script and the workerData to pass it. */
	protected abstract workerScript(): string;
	protected abstract workerData(): { [key: string]: unknown };

	private scheduleIdleShutdown(): void {
		clearTimeout(this.idleTimer);
		if (this.idleShutdownMs <= 0) { return; }
		this.idleTimer = setTimeout(() => {
			if (this.pending.size === 0) {
				const worker = this.worker;
				this.worker = undefined;
				worker?.terminate();
			}
		}, this.idleShutdownMs);
		this.idleTimer.unref?.();
	}

	private getWorker(): Worker {
		if (!this.worker) {
			const worker = new Worker(this.workerScript(), { workerData: this.workerData() });
			worker.on('message', (message: { id: number; result?: SympyResult; error?: string }) => {
				const request = this.pending.get(message.id);
				if (!request) { return; }
				this.pending.delete(message.id);
				clearTimeout(request.timer);
				if (message.error !== undefined) {
					request.reject(new Error(message.error));
				} else {
					request.resolve(message.result!);
				}
				if (this.pending.size === 0) { this.scheduleIdleShutdown(); }
			});
			// A replaced (timed-out and terminated) worker can still emit events
			// asynchronously; only act on events from the current worker.
			worker.on('error', error => {
				if (this.worker === worker) { this.failAll(error); }
			});
			worker.on('exit', code => {
				if (this.worker === worker) {
					this.failAll(new Error('SymPy engine exited unexpectedly (code ' + code + ').'));
				}
			});
			this.worker = worker;
		}
		return this.worker;
	}

	private failAll(error: Error): void {
		for (const request of this.pending.values()) {
			clearTimeout(request.timer);
			request.reject(error);
		}
		this.pending.clear();
		this.worker = undefined;
	}

	evaluate(language: string, expression: string, timeoutMs: number): Promise<SympyResult> {
		clearTimeout(this.idleTimer);
		const id = this.nextRequestId++;
		return new Promise<SympyResult>((resolve, reject) => {
			const worker = this.getWorker();
			const timer = setTimeout(() => {
				this.pending.delete(id);
				// A wedged evaluation can only be stopped by killing the runtime;
				// the next evaluate() starts a fresh worker.
				worker.terminate();
				this.worker = undefined;
				reject(new Error('SymPy evaluation timed out after ' + (timeoutMs / 1000) + 's.'));
			}, timeoutMs);
			this.pending.set(id, { resolve, reject, timer });
			worker.postMessage({ id, language, expression });
		});
	}

	dispose(): void {
		clearTimeout(this.idleTimer);
		const worker = this.worker;
		this.failAll(new Error('Symplex was deactivated.'));
		worker?.terminate();
	}
}
