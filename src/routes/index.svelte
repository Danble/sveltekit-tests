<script>
	import { marked } from 'marked';
	let text =
		'- **Preview:**  A live display of the generated HTML as it would render in a browser. <strong>I am strong</strong>';
</script>

<h1 class="text-3xl font-bold underline">Welcome to SvelteKit</h1>
<p>Visit <a href="https://kit.svelte.dev">kit.svelte.dev</a> to read the documentation</p>
<hr />
<div>{@html marked(text)}</div>
