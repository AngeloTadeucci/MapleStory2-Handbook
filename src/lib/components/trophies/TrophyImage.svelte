<script lang="ts">
  import { url } from '../../helpers/addBasePath';

  type TrophyImageProp = {
    portrait: string;
    name: string;
  };

  let image = '';
  export let { portrait: icon, name } = {} as TrophyImageProp;
  const noImage = url('/resource/sprites/disable overlay.png');

  const handleMissingImage = () => {
    image = noImage;
  };
  $: image = icon === '' ? noImage : url(`/resource/image/trophy/${icon}`);
</script>

<img src={image} width={60} height={60} alt={name} on:error={handleMissingImage} />
