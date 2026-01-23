<script lang="ts">

  type TrophyImageProp = {
    icon: string;
    name: string;
  };

  let { icon, name }: TrophyImageProp = $props();
  const noImage = '/resource/sprites/disable overlay.png';

  const handleMissingImage = () => {
    image = noImage;
  };

  let image = $derived(icon === '' ? noImage : `/resource/image/trophy/${icon}`);
</script>

<img
  src={image}
  width={60}
  height={60}
  alt={name}
  onerror={handleMissingImage}
  class="h-15 w-15 hidden sm:block"
/>
