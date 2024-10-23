<script lang="ts">
  import { url } from '../helpers/addBasePath';

  type MapImageProp = {
    icon: string;
    name: string;
  };

  let { icon, name }: MapImageProp = $props();
  const noImage = url('/resource/sprites/disable overlay.png');

  const handleMissingImage = () => {
    image = noImage;
  };

  let image = $derived(icon === '' ? noImage : url(`/resource/image/map/icon/${icon}`));
</script>

<img src={image} width={60} height={60} alt={name} onerror={handleMissingImage} />
