<script lang="ts">
  import type { Trophy } from '../../types/Trophy';
  import ItemListContainer from '../item/ItemListContainer.svelte';
  import TrophyImage from './TrophyImage.svelte';

  export let trophy: Trophy;
  // todo:
  // - stats
  // - skills
</script>

<ItemListContainer>
  <div>
    <div class="mb-2">
      <TrophyImage name={trophy.name} icon={trophy.icon} />
    </div>
  </div>
</ItemListContainer>
