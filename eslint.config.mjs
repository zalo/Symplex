import tseslint from 'typescript-eslint';

export default tseslint.config(
	...tseslint.configs.recommended,
	{
		files: ['src/**/*.ts'],
		rules: {
			'curly': 'warn',
			'eqeqeq': 'warn',
			'no-throw-literal': 'warn',
			'@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }]
		}
	}
);
