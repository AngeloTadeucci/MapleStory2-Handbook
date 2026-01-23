<script lang="ts">

  type Props = {
    id: number;
    extraClass?: string;
  };

  let { id, extraClass }: Props = $props();

  let copied = $state(false);

  function copyToClipboard(e: Event) {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(id.toString());
    copied = true;
    setTimeout(() => {
      copied = false;
    }, 1500);
  }
</script>

<button
  onclick={copyToClipboard}
  title="Copy ID"
  class="flex items-center justify-center gap-2 rounded-lg border border-gray2 p-1 px-2 {extraClass}"
>
  {#if copied}
    <span class="text-green-400">Copied!</span>
  {:else}
    {id}
    <img src={'/icons/copy-content.svg'} width={20} height={20} alt="Copy" />
  {/if}
</button>
