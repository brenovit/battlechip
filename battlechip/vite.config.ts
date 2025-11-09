import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		host: '0.0.0.0',
		port: 51977,
		strictPort: true,
		fs: {
			allow: ['..']
		}
	},
	preview: {
		host: '0.0.0.0',
		port: 51977,
		strictPort: true
	}
});
