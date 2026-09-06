<script lang="ts">
  let source = $state('/gltf/native-proof/f_body.gltf');
  let loaded = $state(false);
  let failed = $state(false);
  type Viewer = HTMLElement & {
    availableAnimations: string[];
    animationName: string;
    play: () => void;
    pause: () => void;
  };
  let viewer: Viewer | undefined = $state();
  let animations: string[] = $state([]);
  let animation = $state('');
  let playing = $state(false);

  function changeModel(event: Event) {
    const input = event.currentTarget as HTMLSelectElement;
    source = input.value;
    loaded = false;
    failed = false;
    animations = [];
    playing = false;
  }

  function modelLoaded() {
    loaded = true;
    animations = viewer?.availableAnimations ?? [];
    animation = animations[0] ?? '';
    if (viewer) viewer.animationName = animation;
  }

  function selectAnimation(event: Event) {
    animation = (event.currentTarget as HTMLSelectElement).value;
    if (viewer) {
      viewer.animationName = animation;
      viewer.play();
      playing = true;
    }
  }

  function togglePlayback() {
    if (!viewer) return;
    if (playing) viewer.pause();
    else viewer.play();
    playing = !playing;
  }
</script>

<svelte:head>
  <title>Native NIF conversion | Handbook</title>
  <script type="module" src="https://unpkg.com/@google/model-viewer@4.3.1/dist/model-viewer.min.js">
  </script>
</svelte:head>

<main class="mx-auto max-w-5xl p-6">
  <h1 class="mb-3 text-2xl font-bold">Native NIF conversion</h1>
  <p class="mb-4">Inspect the converted models with the Handbook's model viewer.</p>
  <label for="model-source">Model</label>
  <select
    id="model-source"
    class="ml-3 rounded bg-slate-800 p-2"
    style="color: #fff; background: #283344;"
    onchange={changeModel}
  >
    <option value="/gltf/native-proof/f_body.gltf">Female body</option>
    <option value="/gltf/native-proof/m_body.gltf">Male body</option>
    <option value="/gltf/native-proof/hat.gltf">Hat with body skeleton</option>
    <option value="/gltf/native-proof/top.gltf">Clothing with body skeleton</option>
    <option value="/gltf/native-proof/body-hat.gltf">Body and hat attachment</option>
    <option value="/gltf/native-proof/balrog.gltf">Balrog with merged clips</option>
    <option value="/gltf/native-proof/rabbit.gltf">Rabbit NPC</option>
    <option value="/gltf/native-proof/noesis/21000174_m_rabbitdollcymbalsgrey.gltf"
      >Rabbit NPC, Noesis reference</option
    >
  </select>
  {#if animations.length > 0}
    <label for="animation" class="ml-4">Animation</label>
    <select
      id="animation"
      value={animation}
      onchange={selectAnimation}
      style="margin-left: 12px; padding: 8px; color: #fff; background: #283344;"
    >
      {#each animations as name}
        <option value={name}>{name}</option>
      {/each}
    </select>
    <button class="ml-3 rounded border p-2" onclick={togglePlayback}
      >{playing ? 'Pause' : 'Play'}</button
    >
  {/if}
  <p class="my-3" role="status">
    {failed ? 'Model failed to load' : loaded ? 'Model loaded' : 'Loading model…'}
  </p>
  <model-viewer
    bind:this={viewer}
    src={source}
    alt="Native NIF conversion preview"
    camera-controls
    camera-orbit="0deg 80deg auto"
    interaction-prompt="none"
    shadow-intensity="1"
    orientation={source.includes('/noesis/') ? '0deg -90deg 0deg' : '0deg 0deg 0deg'}
    onload={modelLoaded}
    onerror={() => (failed = true)}
    style="width: 100%; height: 650px; background: #303844; border-radius: 12px;"
  ></model-viewer>
</main>
