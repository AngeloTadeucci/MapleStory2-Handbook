import { PUBLIC_MODELS_URL, PUBLIC_NODE_ENV } from '$env/static/public';

function getGltfUrl() {
  const gltfUrl = PUBLIC_NODE_ENV === 'development' ? '/gltf/' : PUBLIC_MODELS_URL;
  return gltfUrl;
}

export default getGltfUrl;
