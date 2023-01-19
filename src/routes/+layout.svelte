<script>
	import PageFooter from '$lib/components/PageFooter.svelte';
	import Navigation from '$lib/components/Navigation.svelte';
	import '../app.css';
</script>

<div class="page-wrapper">
	<Navigation />
	<main>
		<slot />
	</main>
	<PageFooter />
</div>

<style lang="scss">
	.page-wrapper {
		display: grid;
		width: 100%;
		grid-template-columns: 1fr;
		grid-template-rows: 9rem 1fr auto;
		min-height: 100vh;
	}
</style>
