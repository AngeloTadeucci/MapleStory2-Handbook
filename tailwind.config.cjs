/** @type {import('tailwindcss').Config} */
module.exports = {
	darkMode: 'class',
	content: [
		'./src/**/*.{html,js,svelte,ts}',
		require('path').join(require.resolve('@skeletonlabs/skeleton'), '../**/*.{html,js,svelte,ts}')
	],
	theme: {
		extend: {
			colors: {
				'red': '#e93b3b',
				'gold': '#ffd200',
				'blue-ascent': '#225d7c',
				'blue-ascent-bright': '#84d6ff',
				'gray2': '#37393D',
			}
		}
	},
	plugins: [require('@tailwindcss/forms'), ...require('@skeletonlabs/skeleton/tailwind/skeleton.cjs')()]
};
