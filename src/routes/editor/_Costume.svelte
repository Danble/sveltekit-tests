<!-- From: https://github.com/techlab23/ckeditor5-svelte -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  
  export let editor = null,
  value = '',
  config = {};
  $: console.log("val", value, "config", config, "element", editorElement)
  let editorElement;
  let instance = null;

  onMount(() => {
    editor
      .create(editorElement, config)
      .then((editor) => {
        instance = editor;
        const emitInputEvent = () => {
          value = instance.getData();
        };

        instance.model.document.on(
          'change:data',
          emitInputEvent
          //   debounce(emitInputEvent, INPUT_EVENT_DEBOUNCE_WAIT)
        );
      })
      .catch((error) => {
        console.error(error);
      });
  });
  onDestroy(() => {
    if (instance) {
      instance.destroy();
      instance = null;
    }
  });
</script>

<div bind:this={editorElement} contenteditable />
