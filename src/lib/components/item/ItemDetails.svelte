<script lang="ts">
  import { IconCode, Job, Rarity, SlotName, Stat, TransferType } from '../../Enums';
  import { closeMissingTags, unescapeHtml } from '../../helpers/htmlParser';
  import itemHelper from '../../helpers/itemHelper';
  import type { AdditionalEffectDescription } from '../../types/Item';
  import type Item from '../../types/Item';
  import ItemImage from './ItemImage.svelte';
  import ItemBasicAttributes from './ItemBasicAttributes.svelte';
  import ItemRandomAttributes from './ItemRandomAttributes.svelte';

  interface Props {
    item: Item;
    descriptions: AdditionalEffectDescription[];
  }

  let { item, descriptions }: Props = $props();

  const mainStat = () => {
    if (item.represent_option === 27) {
      const minAttack = item.constants_stats.find((x) => x.Item1.ItemAttribute == 27)?.Item1.Value;

      const maxAttack = item.constants_stats.find((x) => x.Item1.ItemAttribute == 28)?.Item1.Value;
      return `${minAttack}~${maxAttack}`;
    }

    return item.constants_stats.find((x) => x.Item1.ItemAttribute == item.represent_option)?.Item1
      .Value;
  };

  const generateItemDescription = () => {
    let description: string = Rarity[item.rarity];

    if (item.is_outfit) {
      description += ' Outfit';
    }

    if (item.icon_code === 1 || item.icon_code === 2 || item.icon_code === 3) {
      return (description += ' ' + SlotName[Number(item.item_preset)]);
    }
    return (description += ' ' + IconCode[item.icon_code]);
  };

  const fixedMainDescription = $derived(closeMissingTags(unescapeHtml(item.main_description), true));
</script>

<div class="relative mt-2 flex flex-col">
  <div class="item-top">
    <div class="item-top__iconcode">
      <img
        src={`/resource/icons/icon_code/${item.icon_code}.png`}
        width={57}
        height={63}
        alt="Icon Code"
        title="Icon Code"
      />
    </div>
    <div class="item-top__image">
      <img
        src={`/resource/sprites/rarity star ${item.rarity}.png`}
        width={93}
        height={16}
        alt="Rarity"
        title="Rarity"
      />
      <div class="mt-2 flex gap-4">
        <ItemImage
          iconPath={item.icon_path}
          rarity={item.rarity}
          name={item.name}
          isOutfit={item.is_outfit}
        />
        <div class="flex flex-col gap-1">
          {#if !item.is_outfit}
            {#if itemHelper.isArmor(item.slot) || itemHelper.isAccessory(item.slot)}
              <p class="font-medium">{Stat[item.represent_option]}</p>
              <div class="value__container">
                <div class={`value__container__blur text-3xl rarity-${item.rarity}`}>
                  {mainStat()}
                </div>
                <div class={`value__container__value rarity-black text-3xl`}>
                  {mainStat()}
                </div>
              </div>
            {/if}
            {#if itemHelper.isWeapon(item.slot)}
              <p class="font-medium">Weapon Attack</p>
              <div class="value__container">
                <div class={`value__container__blur text-3xl rarity-${item.rarity}`}>
                  {mainStat()}
                </div>
                <div class={`value__container__value rarity-black text-3xl`}>
                  {mainStat()}
                </div>
              </div>
            {/if}
          {/if}
          {#if itemHelper.isConsumable(item.id)}
            {#if fixedMainDescription.includes('<br>')}
              <p class="text-sm">
                {@html closeMissingTags(unescapeHtml(item.main_description), true).split('<br>')[0]}
              </p>
              <p class="text-2xl">
                {@html closeMissingTags(unescapeHtml(item.main_description), true).split('<br>')[1]}
              </p>
            {:else}
              <p class="text-2xl">{fixedMainDescription}</p>
            {/if}
          {/if}
        </div>
      </div>
    </div>
  </div>
  <div class="item-middle">
    <div class="flex flex-col gap-1">
      {#if item.gear_score > 0}
        <p>Gear score {item.gear_score}</p>
      {/if}

      {#if item.level_min > 1}
        <p>Requires level {item.level_min}</p>
      {/if}

      <p>{generateItemDescription()}</p>

      {#if !item.job_limit.includes(Job.GlobalJob)}
        <p>
          Job:{' '}
          {item.job_limit.length > 0 ? item.job_limit.map((j) => Job[j]).join(', ') : 'None'}
        </p>
      {/if}

      {#if item.main_description.length > 0 && !itemHelper.isConsumable(item.id)}
        <p>{@html closeMissingTags(unescapeHtml(item.main_description), true)}</p>
      {/if}
    </div>
    {#if item.gender !== 2}
      <div class="absolute right-4">
        <img
          src={`/item/genderLimit ${item.gender}.png`}
          width={22}
          height={22}
          alt="Gender"
        />
      </div>
    {/if}
  </div>
  {#if item.constants_stats.length > 0 || item.static_stats.length > 0 || item.guide_description.length > 0 || item.tooltip_description.length > 0}
    <hr id="splitline1" />
  {/if}
  <div class="item-middle">
    {#if item.constants_stats.length > 0 || item.static_stats.length > 0}
      <ItemBasicAttributes
        constantsStats={item.constants_stats}
        staticStats={item.static_stats}
        representOption={item.represent_option}
        additionalEffectsDescriptions={descriptions}
        additionalEffects={item.additional_effects}
      />
    {/if}
    {#if item.random_stats.length > 0}
      <ItemRandomAttributes
        randomStats={item.random_stats}
        randomStatCount={item.random_stat_count}
      />
    {/if}
    {#if item.guide_description.length > 0 || item.tooltip_description.length > 0}
      <div class="item-middle__descriptions">
        {#if item.tooltip_description.length > 0}
          <p>{@html closeMissingTags(unescapeHtml(item.tooltip_description))}</p>
        {/if}
        {#if item.guide_description.length > 0}
          <p class="item-middle__descriptions__guide">
            {@html closeMissingTags(unescapeHtml(item.guide_description), true)}
          </p>
        {/if}
      </div>
    {/if}
  </div>
  {#if item.set_name !== '' && item.set_data}
    <hr id="splitline1" />
    <div class="item-middle pt-3">
      <p class="text-green">{item.set_name}</p>
      <ul>
        {#each item.set_data as set}
          <a href={`/items/${set.Item1}`} data-sveltekit-reload>
            <li class="mt-1">{set.Item2}</li>
          </a>
        {/each}
      </ul>
    </div>
  {/if}
  <hr id="splitline1" />
  <div class="item-middle gap-1 pt-3">
    {#if item.tradeable_count > 0}
      <p class="text-gold">Tradable {item.tradeable_count} time(s).</p>
    {/if}
    {#if item.tradeable_count === 0}
      <p class="text-red">Untradable</p>
    {/if}
    <span class={`text-${item.sellable ? 'gold' : 'red'}`}>
      {item.sellable ? 'Sellable' : 'Unsellable'}
    </span>
    <p class="text-red">{TransferType[item.transfer_type]}</p>
    {#if item.repackage_limit > 0}
      <p class="text-gold">
        Possible repackages: {item.repackage_limit} (Requires [
        <a href={`/items/20302422`} data-sveltekit-reload>Trader's Ribbon</a>
        ] x{item.repackage_count})
      </p>
    {/if}
    {#if item.item_type === 1 && !item.is_outfit}
      {#if item.enchantable}
        <p class="text-gold">Can be enchanted</p>
      {:else}
        <p class="text-red">Cannot be Enchanted</p>
      {/if}
    {/if}
    {#if item.item_type === 1}
      {#if item.dyeable === 1}
        <p class="text-gold">Can be Dyed</p>
      {/if}
    {:else}
      <p class="text-red">Cannot be Dyed</p>
    {/if}
    {#if item.glamour_count > 0}
      <p class="text-gold">Glamour Forges Possible: {item.glamour_count}</p>
    {/if}
  </div>
  <div class="item-bot"></div>
</div>

<style>
  .item-top {
    position: relative;
    background-image: url('/item/item_top.png');
    background-repeat: no-repeat;
    width: 430px;
    height: 136px;
  }

  .item-top__iconcode {
    position: absolute;
    top: 20px;
    right: 17px;
  }

  .item-top__image {
    margin-top: 40px;
    margin-left: 15px;
  }

  .item-middle {
    padding-left: 15px;
    padding-bottom: 15px;
    background-image: url('/item/item_middle.png');
    background-repeat: repeat-y;
    display: flex;
    flex-direction: column;
    width: 430px;
  }

  .item-middle__descriptions {
    margin-top: 15px;
    margin-right: 12px;
  }

  .item-middle__descriptions__guide {
    margin-bottom: 15px;
  }

  .item-bot {
    position: relative;
    background-image: url('/item/item_bot.png');
    width: 430px;
    height: 14px;
  }

  hr#splitline1 {
    background-image: url('/item/splitline.png');
    background-repeat: no-repeat;
    margin: 0;
    width: 430px;
    height: 2px;
    border: none;
  }

  .value__container {
    position: relative;
  }

  .value__container__blur {
    position: absolute;
    z-index: 1;
  }

  .value__container__value {
    position: absolute;
    z-index: 2;
  }

  .rarity-1 {
    text-shadow:
      -3px -3px 0 #ffffff,
      0 -3px 0 #ffffff,
      3px -3px 0 #ffffff,
      3px 0 0 #ffffff,
      3px 3px 0 #ffffff,
      0 3px 0 #ffffff,
      -3px 3px 0 #ffffff,
      -3px 0 0 #ffffff;
    filter: blur(2px);
  }

  .text-1 {
    color: #ffffff;
  }

  .rarity-2 {
    text-shadow:
      -3px -3px 0 #b0f350,
      0 -3px 0 #b0f350,
      3px -3px 0 #b0f350,
      3px 0 0 #b0f350,
      3px 3px 0 #b0f350,
      0 3px 0 #b0f350,
      -3px 3px 0 #b0f350,
      -3px 0 0 #b0f350;
    filter: blur(2px);
  }

  .text-2 {
    color: #b0f350;
  }

  .rarity-3 {
    text-shadow:
      -3px -3px 0 #45d1ff,
      0 -3px 0 #45d1ff,
      3px -3px 0 #45d1ff,
      3px 0 0 #45d1ff,
      3px 3px 0 #45d1ff,
      0 3px 0 #45d1ff,
      -3px 3px 0 #45d1ff,
      -3px 0 0 #45d1ff;
    filter: blur(2px);
  }

  .text-3 {
    color: #45d1ff;
  }

  .rarity-4 {
    text-shadow:
      -3px -3px 0 #c888ff,
      0 -3px 0 #c888ff,
      3px -3px 0 #c888ff,
      3px 0 0 #c888ff,
      3px 3px 0 #c888ff,
      0 3px 0 #c888ff,
      -3px 3px 0 #c888ff,
      -3px 0 0 #c888ff;
    filter: blur(2px);
  }

  .text-4 {
    color: #c888ff;
  }

  .rarity-5 {
    text-shadow:
      -3px -3px 0 #ffd533,
      0 -3px 0 #ffd533,
      3px -3px 0 #ffd533,
      3px 0 0 #ffd533,
      3px 3px 0 #ffd533,
      0 3px 0 #ffd533,
      -3px 3px 0 #ffd533,
      -3px 0 0 #ffd533;
    filter: blur(2px);
  }

  .text-5 {
    color: #ffd533;
  }

  .rarity-6 {
    text-shadow:
      -3px -3px 0 #ff8c37,
      0 -3px 0 #ff8c37,
      3px -3px 0 #ff8c37,
      3px 0 0 #ff8c37,
      3px 3px 0 #ff8c37,
      0 3px 0 #ff8c37,
      -3px 3px 0 #ff8c37,
      -3px 0 0 #ff8c37;
    filter: blur(2px);
  }

  .text-6 {
    color: #ff8c37;
  }

  .rarity-black {
    text-shadow:
      -1.5px -1.5px 0 #000000,
      0 -1.5px 0 #000000,
      1.5px -1.5px 0 #000000,
      1.5px 0 0 #000000,
      1.5px 1.5px 0 #000000,
      0 1.5px 0 #000000,
      -1.5px 1.5px 0 #000000,
      -1.5px 0 0 #000000;
  }
</style>
