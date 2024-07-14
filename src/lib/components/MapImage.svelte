<script lang="ts">
  import { url } from '../helpers/addBasePath';

  type MapImageProp = {
    icon: string;
    name: string;
  };

  let image = '';
  export let { icon, name } = {} as MapImageProp;
  const noImage = url('/resource/sprites/disable overlay.png');

  const handleMissingImage = () => {
    image = noImage;
  };

  $: image = icon === '' ? noImage : url(`/resource/image/map/icon/${icon}`);
</script>

<img src={image} width={60} height={60} alt={name} on:error={handleMissingImage} />
