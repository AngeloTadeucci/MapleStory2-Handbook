<script lang="ts">
  import { colorPalettes, type ColorPalette } from '$lib/colorPalette';
  import { getColorPaletteName } from '$lib/colorPaletteName';
  import PaletteColor from '$lib/components/PaletteColor.svelte';
  import TrophyImage from '$lib/components/trophies/TrophyImage.svelte';
  import { ConditionType, RewardType, type Trophy, type TrophyGrade } from '$lib/types/Trophy';

  interface Props {
    trophy: Trophy;
    grade: TrophyGrade;
  }

  let { trophy, grade }: Props = $props();

  const rewardColors = $derived.by(() => {
    const colors: ColorPalette[] = [];
    if (grade.rewardType == RewardType.itemcoloring) {
      for (const palette of colorPalettes) {
        if (palette.achieveID == trophy.id) {
          colors.push(palette);
        }
      }
    }
    return colors;
  });

  const isQuest = $derived(
    grade.conditionType == ConditionType.quest_clear || grade.conditionType == ConditionType.quest
  );
  const isItem = $derived(
    grade.rewardType == RewardType.item ||
    grade.rewardType == RewardType.shop_weapon ||
    grade.rewardType == RewardType.shop_build ||
    grade.rewardType == RewardType.shop_ride
  );
  const isBeauty = $derived(
    grade.rewardType == RewardType.beauty_makeup ||
    grade.rewardType == RewardType.beauty_skin ||
    grade.rewardType == RewardType.beauty_hair
  );

  const beautyRewards = $derived.by(() => {
    const rewards: {
      gender: string;
      rewardId: number;
      readableReward: string;
    }[] = [];
    if (isBeauty) {
      const genderRewards = grade.readableReward.split(',');
      //  male:10400077:Crescent Moon Tattoo,female:10400085:Crescent Moon Tattoo
      for (const genderReward of genderRewards) {
        const genderRewardSplit = genderReward.split(':');
        const gender = genderRewardSplit[0];
        const rewardId = parseInt(genderRewardSplit[1]);
        const readableReward = genderRewardSplit[2];
        rewards.push({ gender, rewardId, readableReward });
      }
    }
    return rewards;
  });

  const fixedDescription = $derived(
    trophy.description.replace('{0}', Intl.NumberFormat().format(grade.conditionValue))
  );
</script>

<div class="flex gap-1">
  <TrophyImage icon={trophy.icon} name={trophy.name} />
  <div class="flex flex-col justify-start items-start">
    <p class="font-bold">
      {#if isQuest}
        <a href="/quests/{grade.conditionCode[0]}" class="underline">
          {fixedDescription}
        </a>
      {:else}
        {fixedDescription}
      {/if}
    </p>
    {#if grade.rewardType != RewardType.unknown}
      {#if grade.rewardType == RewardType.itemcoloring}
        <p>Reward:</p>
        <div class="flex flex-col gap-1">
          {#each rewardColors as color}
            <div class="flex gap-1">
              <PaletteColor {color} />
              <p class="text-gold">{getColorPaletteName(color.stringKey)} Dye</p>
            </div>
          {/each}
        </div>
      {:else if isItem}
        <p>
          Reward:
          <a href="/items/{grade.rewardId}" class="text-gold underline">
            {grade.readableReward}
          </a>
        </p>
      {:else if isBeauty}
        <div class="flex flex-col">
          Reward:
          {#each beautyRewards as rewards}
            <a href="/items/{rewards.rewardId}" class="text-gold underline">
              {rewards.readableReward} ({rewards.gender.toLocaleUpperCase()})
            </a>
          {/each}
        </div>
      {:else}
        <p>Reward: <span class="text-gold">{grade.readableReward}</span></p>
      {/if}
    {/if}
  </div>
</div>

<style>
  .text-gold {
    color: #ffd533;
  }
</style>
