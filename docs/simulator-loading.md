# Simulator startup measurements, 2026-09-09

The live `/outfits` page reached its item-picker catalog request at 25.0 seconds in a
fresh Chrome context. Its 42 sequential face-image requests accounted for 13.2
seconds of response waiting. The default body face and starter outfit face both
loaded every expression image and mask sequentially.

`FaceAnimation.load` now downloads unique source images and masks concurrently,
then creates textures after all downloads succeed. Repeated masks and frames use
one request per source within the load. Customization metadata also downloads
alongside the native manifest instead of starting afterward.

A browser benchmark bundled the previous and modified loaders independently and
loaded the same production assets in separate fresh Chrome contexts:

| Face                     |   Before |   After |
| ------------------------ | -------: | ------: |
| Default female, 10300003 |  7.906 s | 0.926 s |
| Starter face, 10300004   |  7.618 s | 0.840 s |
| Total                    | 15.524 s | 1.766 s |

Initial rendered texture pixel SHA-256 values matched before and after for both
faces. This verifies the initial face textures, not every expression or complete
outfit appearance. The benchmark runs the actual face loader against public CDN
assets; it is not a post-deployment full-page measurement.

Verification: 233 unit tests passed, 20 fixture-dependent tests skipped;
`svelte-check` reported zero errors and warnings. New tests hold responses open
to prove all unique requests start concurrently, and check failed-load recovery.

The live trace also showed a 2.8-second first catalog lookup. The API currently
rebuilds its catalog after a 60-second TTL and does not coalesce concurrent cold
loads. That is a separate remaining startup optimization, left unchanged here.
Do not parallelize starter-item lookups without addressing concurrent cache
rebuilds. Geometry and equipment installation also remain sequential.

Raw measurements are retained in the backend's ignored
`NifToGltf/obj/pc-handoff-audit/simulator-load-baseline.json` and
`face-loading-benchmark.json`. These frontend changes have not been committed or
deployed. No R2 asset changes are required.

Targeted ESLint could not run because the project does not declare or install
ESLint, although its lint script references it. Formatting and diff checks passed.
This existing lint configuration gap is unchanged.

A compiled local preview using the public R2 assets loaded the starter outfit in
12.837 seconds in a fresh Chrome session, with no JavaScript errors. The checked
model and manifest requests all used the public CDN. This local result includes
the full page startup, but uses a different completion marker from the baseline
item-picker request. It is not a controlled production before/after comparison.
