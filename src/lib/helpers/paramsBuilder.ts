function paramsBuilder(
	params: {
		name: string;
		value: string | number | undefined | null;
	}[]
): string {
	let url = '?';

	// iterate through the array of parameter objects
	for (let i = 0; i < params.length; i++) {
		const { name, value } = params[i];

		// skip parameters with undefined or null values
		if (value === undefined || value === null || value === '') {
			continue;
		}

		// add '&' separator if this is not the first parameter
		if (url.length > 1) {
			url += '&';
		}

		// encode parameter name and value, then append to url
		url += encodeURIComponent(name) + '=' + encodeURIComponent(value.toString());
	}

	// return the resulting url
	return url;
}

export default paramsBuilder;
