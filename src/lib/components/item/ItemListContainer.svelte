<script lang="ts">
  import type { Snippet } from "svelte";

  type Props = {
    gap?: number;
    classname?: string;
    children: Snippet;
  };
  let { gap = 1, classname, children }: Props = $props();
</script>

<div class={classname ? classname : 'lg:mt-7'}>
  <div class="box__top"></div>
  <div class="box__middle flex flex-col gap-{gap} p-4 px-8">
    {@render children()}
  </div>
  <div class="box__bot"></div>
</div>

<style>
  .box__top {
    position: relative;
    background-image: url('/item/item_box_top.png');
    width: 575px;
    height: 12px;
  }

  .box__middle {
    position: relative;
    background-image: url('/item/item_box_middle.png');
    background-repeat: repeat-y;
    width: 575px;
  }

  .box__bot {
    position: relative;
    background-image: url('/item/item_box_bot.png');
    width: 575px;
    height: 14px;
  }
</style>
