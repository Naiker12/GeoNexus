import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: {
			'@': path.resolve(__dirname, 'src')
		}
	},
	test: {
		globals: true,
		environment: 'node',
		include: ['src/**/*.test.{ts,tsx}', 'src/__tests__/**/*.{ts,tsx}'],
	},
})
