export function unescape(html: string): string {
	let returnText = html;
	returnText = returnText.replaceAll(/&nbsp;/gi, ' ');
	returnText = returnText.replaceAll(/&amp;/gi, '&');
	returnText = returnText.replaceAll(/&quot;/gi, `"`);
	returnText = returnText.replaceAll(/&lt;/gi, '<');
	returnText = returnText.replaceAll(/&gt;/gi, '>');
	returnText = returnText.replaceAll(/&apos;/gi, "'");
	returnText = returnText.replaceAll('\\n', '<br>');
	returnText = returnText.replaceAll('size=', 'uwu=');

	return returnText;
}

// Closes any unclosed tags, accounts for self closing tags
export function closeMissingTags(html: string, transformColorToWhite?: boolean): string {
	let output = '';
	const stack: string[] = [];
	const selfClosingTags = ['br'];
	for (let i = 0; i < html.length; i++) {
		if (html[i] === '<') {
			let tagName = '';
			let j = i + 1;
			while (html[j] !== '>' && html[j] !== ' ') {
				tagName += html[j];
				j++;
			}

			// check if font color, change to white, skip to end of tag
			if (tagName === 'font' && transformColorToWhite) {
				output += '<font color="white">';
				while (html[j] !== '>') {
					j++;
				}
				i = j;
				continue;
			}

			if (selfClosingTags.includes(tagName)) {
				output += '<';
				continue;
			}
			if (html[i + 1] !== '/') {
				stack.push(tagName);
			} else {
				stack.pop();
			}
		}
		output += html[i];
	}
	for (let i = stack.length - 1; i >= 0; i--) {
		output += `</${stack[i]}>`;
	}
	return output;
}
