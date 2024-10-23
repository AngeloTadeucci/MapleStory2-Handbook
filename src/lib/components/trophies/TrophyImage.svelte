<script lang="ts">
  import { url } from '../../helpers/addBasePath';

  type TrophyImageProp = {
    icon: string;
    name: string;
  };

  let { icon, name }: TrophyImageProp = $props();
  const noImage = url('/resource/sprites/disable overlay.png');

  const handleMissingImage = () => {
    image = noImage;
  };

  let image = $derived(icon === '' ? noImage : url(`/resource/image/trophy/${icon}`));
</script>

<img
  src={image}
  width={60}
  height={60}
  alt={name}
  onerror={handleMissingImage}
  class="h-[60px] w-[60px] hidden sm:block"
/>
