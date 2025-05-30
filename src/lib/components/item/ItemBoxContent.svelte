<script lang="ts">
  import { Job, Jobs } from '../../Enums';
  import { url } from '../../helpers/addBasePath';
  import type { ItemBox } from '../../types/ItemBox';
  import ItemImage from './ItemImage.svelte';
  import ItemListContainer from './ItemListContainer.svelte';

  interface Props {
    boxContent: ItemBox[];
  }

  let { boxContent }: Props = $props();

  let filterJob: Job = $state(0);

  const filterList = () => {
    filtered = boxContent.filter((x) => {
      if (filterJob === 0) {
        return x.item1.job_limit.includes(filterJob) && x.item1.job_recommend.includes(filterJob);
      }
      return x.item1.job_limit.includes(filterJob) || x.item1.job_recommend.includes(filterJob);
    });

    if (filterJob !== 0) {
      filtered = filtered.concat(
        boxContent.filter((x) => x.item1.job_limit.includes(0) && x.item1.job_recommend.includes(0))
      );
    }
  };

  const hasSmartDropRate = boxContent.some((x) => x.smart_drop_rate > 0);
  let filtered: ItemBox[] = $state([]);
  if (hasSmartDropRate) {
    filterList();
  }
</script>

{#if hasSmartDropRate}
  <ItemListContainer>
    <div class="flex items-center">
      <p>Filters:</p>
      <div class="ml-auto flex gap-2">
        {#each Jobs as job, index}
          {#if index > 1}
            <button
              class="cursor-pointer {filterJob === job ? '' : 'brightness-50'}"
              onclick={() => {
                if (filterJob === job) {
                  filterJob = 0;
                } else {
                  filterJob = job;
                }
                filterList();
              }}
            >
              <img
                src={url(`/resource/icons/job/${job}.png`)}
                alt={Job[job]}
                width={24}
                height={25}
              />
            </button>
          {/if}
        {/each}
      </div>
    </div>
    <div>
      {#if filtered.length > 0}
        <hr class="my-3" />
      {/if}
      <div class="flex flex-col gap-3">
        {#each filtered as content}
          <a
            href={url(`/items/${content.item_id}`)}
            data-sveltekit-reload
            class="unstyled flex items-center gap-4"
          >
            <ItemImage
              iconPath={content.item1.icon_path}
              rarity={content.rarity}
              name={content.item1.name}
              minCount={content.min_count}
              maxCount={content.max_count}
            />
            {content.item1.name}
          </a>
        {/each}
      </div>
    </div>
  </ItemListContainer>
{/if}

{#if !hasSmartDropRate}
  <ItemListContainer gap={4}>
    {#each boxContent as content}
      <a
        href={url(`/items/${content.item_id}`)}
        data-sveltekit-reload
        class="flex items-center gap-4"
        id={String(content.item_id)}
      >
        <ItemImage
          iconPath={content.item1.icon_path}
          rarity={content.rarity}
          name={content.item1.name}
          minCount={content.min_count}
          maxCount={content.max_count}
        />
        <p>{content.item1.name}</p>
      </a>
    {/each}
  </ItemListContainer>
{/if}
