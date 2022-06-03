<script lang="ts">
  import {onMount} from 'svelte'
  import Costume from './_Costume.svelte';
  let editor: any;
  let mounted = false;
  onMount(async () => {
    editor = (await import('ckeditor5-build-classic-with-alignment-underline-smallcaps')).default;
    mounted = true;
  });
  let editorConfig = {
    // TODO: figure out which plugins to remove related to photos to speed up
    // removePlugins: ['MediaEmbed'],
    // Available plugins for ClassicEditor: Essentials, CKFinderUploadAdapter, Autoformat, Bold, Italic, BlockQuote, CKFinder, EasyImage, Heading, Image, ImageCaption, ImageStyle, ImageToolbar, ImageUpload, Link, List, MediaEmbed, Paragraph, PasteFromOffice, Table, TableToolbar, ++ Alignment
    // To Discover: ClassicEditor.builtinPlugins.map(plugin => { console.log(plugin.pluginName); });
    alignment: {
      options: ['left', 'right', 'center', 'justify'],
    },
    toolbar: [
      'heading',
      '|',
      'bold',
      'italic',
      /* 'underline',
      'smallCaps',
      'alignment',
      'link',
      'bulletedList',
      'numberedList',
      'blockQuote',
      'insertTable',
      'undo',
      'redo', */
    ],
  };
</script>

{#if mounted}
  <Costume bind:editor bind:config={editorConfig} />
{/if}