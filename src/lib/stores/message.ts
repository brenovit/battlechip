import { writable } from 'svelte/store';

export interface MessageState {
	text: string;
	type?: 'info' | 'success' | 'error' | 'warning';
}

function createMessageStore() {
	const { subscribe, set } = writable<MessageState>({ text: '', type: 'info' });

	return {
		subscribe,
		show: (text: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
			set({ text, type });
		},
		clear: () => {
			set({ text: '', type: 'info' });
		}
	};
}

export const messageStore = createMessageStore();
