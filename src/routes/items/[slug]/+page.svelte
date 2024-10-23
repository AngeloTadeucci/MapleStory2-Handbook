<script lang="ts">
  import ItemDetails from '$lib/components/item/ItemDetails.svelte';
  import ItemBoxContent from '$lib/components/item/ItemBoxContent.svelte';
  import { url } from '$lib/helpers/addBasePath';
  import { onMount } from 'svelte';
  import type { PageData } from './$types';
  import CopyId from '$lib/components/CopyId.svelte';
  import type { ItemBox } from '$lib/types/ItemBox';
  import type Item from '$lib/types/Item';
  import type { AdditionalEffectDescription } from '$lib/types/Item';
  import ItemRenderer from '$lib/components/item/ItemRenderer.svelte';
  import getGltfUrl from '$lib/getGltfUrl';

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();
  const {
    item: resultItem,
    boxContent: resultBoxContent,
    additionalEffectDescriptions
  } = data.props;

  const item = resultItem as unknown as Item;
  const boxContent = resultBoxContent as unknown as ItemBox[];
  const descriptions = additionalEffectDescriptions as unknown as AdditionalEffectDescription[];

  let gltfExists: boolean = $state();

  const gltfUrl = getGltfUrl();

  async function incrementViewCount() {
    await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds

    try {
      await fetch(`/api/items?id=${item.id}`, {
        method: 'POST'
      });
    } catch {}
  }

  onMount(async () => {
    if (!item) {
      return;
    }

    incrementViewCount();
    if (item.kfms.length <= 0) {
      return;
    }

    try {
      if (item.kfms[0] === 'empty') {
        gltfExists = false;
        return;
      }
      const response = await fetch(`${gltfUrl}${item.kfms[0]}/${item.kfms[0]}.gltf`, {
        method: 'HEAD'
      });
      if (response.status === 404) {
        gltfExists = false;
      } else {
        gltfExists = true;
      }
    } catch {}
  });
</script>

<svelte:head>
  <title>MS2 Handbook - {item.name}</title>
  <!-- Open graph -->
  <meta property="og:title" content={item.name} />
  <meta property="og:description" content={item.name} />
  <meta property="og:image" content={url(`/${item.icon_path.split('/').slice(2).join('/')}`)} />
  <meta property="og:url" content={url(`/items/${item.id}`)} />
</svelte:head>

<div class="mt-5 grid justify-center">
  <div class="ml-4 flex items-center gap-1">
    <a href="/items" class="unstyled underline">Item</a>
    &gt;
    <CopyId id={item.id} />
  </div>
  <div class="main-container grid-image mx-4 mt-3 rounded-xl p-6 pb-40">
    <h1>{item.name}</h1>
    <div class="flex flex-col flex-wrap justify-start gap-16 gap-y-2 xl:flex-row">
      <ItemDetails {item} {descriptions} />
      {#if item.kfms.length > 0 && gltfExists}
        <div
          class="model mt-7 flex items-center justify-center px-3 pt-2 lg:h-[799px] lg:w-[575px]"
        >
          <ItemRenderer {item} />
          <img
            src={url('/item/mouse_controls.png')}
            class="absolute bottom-5 left-5 hidden md:block"
            alt="Mouse Controls"
          />
        </div>
      {/if}
      {#if boxContent.length > 0}
        <ItemBoxContent {boxContent} />
      {/if}
    </div>
  </div>
</div>

<style lang="scss">
  .model {
    position: relative;
    background-image: url('/item/render_box.png');
    background-size: cover;
    background-repeat: no-repeat;
  }
</style>
