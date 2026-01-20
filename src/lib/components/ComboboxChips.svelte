<script lang="ts">
  import { Combobox, Portal, type ComboboxRootProps, useListCollection } from '@skeletonlabs/skeleton-svelte';

  interface Props {
    name: string;
    value: string[];
    whitelist: string[];
    placeholder?: string;
    onValueChange?: () => void;
  }

  let {
    name,
    value = $bindable([]),
    whitelist,
    placeholder = 'Select...',
    onValueChange
  }: Props = $props();

  const options = $derived(whitelist.map((item) => ({
    label: item,
    value: item
  })));

  let items = $state<{ label: string; value: string }[]>([]);

  // Update items when whitelist changes
  $effect(() => {
    items = options;
  });

  const collection = $derived(
    useListCollection({
      items: items,
      itemToString: (item) => item.label,
      itemToValue: (item) => item.value
    })
  );

  const handleOpenChange = () => {
    items = options;
  };

  const handleInputValueChange: ComboboxRootProps['onInputValueChange'] = (event) => {
    const filtered = options.filter((item) =>
      item.value.toLowerCase().includes(event.inputValue.toLowerCase())
    );
    items = filtered.length > 0 ? filtered : options;
  };

  const handleValueChange: ComboboxRootProps['onValueChange'] = (event) => {
    value = event.value;
    onValueChange?.();
  };

  function removeChip(chipValue: string) {
    value = value.filter((v) => v !== chipValue);
    onValueChange?.();
  }
</script>

<div class="w-full">
  <Combobox
    {name}
    {placeholder}
    {collection}
    onOpenChange={handleOpenChange}
    onInputValueChange={handleInputValueChange}
    {value}
    onValueChange={handleValueChange}
    multiple
    openOnClick
  >
    <Combobox.Control class="w-full bg-surface-700 border-transparent rounded-md p-2 flex items-center cursor-pointer">
      <Combobox.Input class="w-full bg-transparent text-surface-50 placeholder:text-surface-400 border-none focus:ring-0 cursor-pointer" />
      <Combobox.Trigger class="text-surface-400 hover:text-surface-50" />
    </Combobox.Control>
    <Portal>
      <Combobox.Positioner>
        <Combobox.Content class="bg-surface-700 border border-surface-600 rounded-md shadow-xl z-50">
          {#each items as item (item.value)}
            <Combobox.Item {item} class="flex items-center justify-between text-surface-50 hover:bg-surface-600 data-highlighted:bg-surface-600 data-[state=checked]:bg-primary-500 data-[state=checked]:text-surface-950 px-3 py-2 cursor-pointer">
              <Combobox.ItemText>{item.label}</Combobox.ItemText>
              <Combobox.ItemIndicator />
            </Combobox.Item>
          {/each}
        </Combobox.Content>
      </Combobox.Positioner>
    </Portal>
  </Combobox>
  {#if value.length > 0}
    <div class="flex flex-wrap gap-2 mt-2">
      {#each value as chip (chip)}
        <button
          type="button"
          class="chip preset-filled rounded-md"
          onclick={() => removeChip(chip)}
        >
          <span>{chip}</span>
          <span>✕</span>
        </button>
      {/each}
    </div>
  {/if}
</div>
