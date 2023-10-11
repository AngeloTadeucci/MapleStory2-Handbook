<script lang="ts">
  import { url } from '../helpers/addBasePath';

  type NpcImageProp = {
    portrait: string;
    name: string;
    asdas: string;
  };

  let image = '';
  export let { portrait, name } = {} as NpcImageProp;
  const noImage = url('/resource/sprites/disable overlay.png');
  const fixIconPath = () => url(`/${portrait.split('/').slice(2).join('/')}`);

  const handleMissingImage = () => {
    image = noImage;
  };

  $: image = portrait === '' ? noImage : fixIconPath();
</script>

<img src={image} width={60} height={60} alt={name} on:error={handleMissingImage} />
