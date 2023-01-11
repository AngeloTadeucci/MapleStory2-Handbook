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
