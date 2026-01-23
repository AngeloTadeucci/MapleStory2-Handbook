<script lang="ts">

  type NpcImageProp = {
    portrait: string;
    name: string;
  };

  let { portrait, name }: NpcImageProp = $props();
  const noImage = '/resource/sprites/disable overlay.png';
  const fixIconPath = () => `/${portrait.split('/').slice(2).join('/')}`;

  const handleMissingImage = () => {
    image = noImage;
  };

  let image = $derived(portrait === '' ? noImage : fixIconPath());
</script>

<img src={image} width={60} height={60} alt={name} onerror={handleMissingImage} />
