<script lang="ts">
  import { getImageUrl } from '$lib/getImageUrl';

  type MapImageProp = {
    icon: string;
    name: string;
  };

  let { icon, name }: MapImageProp = $props();
  const noImage = '/resource/sprites/disable overlay.png';

  const handleMissingImage = () => {
    image = noImage;
  };

  let image = $derived(icon === '' ? noImage : getImageUrl(`/resource/image/map/icon/${icon}`));
</script>

<img src={image} width={60} height={60} alt={name} onerror={handleMissingImage} />
