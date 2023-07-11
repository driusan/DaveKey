import {canUseNativeMFM} from './MFM';

test('can use native MFM for empty string', () => {
    expect(canUseNativeMFM('')).toEqual(true);
});
test('can use native MFM for text', () => {
    expect(canUseNativeMFM('foo')).toEqual(true);
    expect(canUseNativeMFM("foo\n\nbar")).toEqual(true);
});
test('can use native MFM for url', () => {
    expect(canUseNativeMFM('https://example.com')).toEqual(true);
});
test('can use native MFM for link', () => {
    expect(canUseNativeMFM('[Example](https://example.com)')).toEqual(true);
});
test('can use native MFM for mention', () => {
    expect(canUseNativeMFM('@foo')).toEqual(true);
    expect(canUseNativeMFM('@foo@example.com')).toEqual(true);
});
test('can use native MFM for unicode emoji', () => {
    expect(canUseNativeMFM('💩')).toEqual(true);
});
test('can use native MFM for hashtag', () => {
    expect(canUseNativeMFM('#HashyMcHashHash')).toEqual(true);
});
test('can use native MFM for bold', () => {
    expect(canUseNativeMFM('**bold**')).toEqual(true);
});
test('can use native MFM for italic', () => {
    expect(canUseNativeMFM('*italic*')).toEqual(true);
});
test('can not use native MFM for mathInline', () => {
    expect(canUseNativeMFM("\\(x= \\frac{-b' \\pm \\sqrt{(b')^2-ac}}{a}\\)")).toEqual(false);
});
test('can not use native MFM for mathBlock', () => {
    expect(canUseNativeMFM("\\[x= \\frac{-b' \\pm \\sqrt{(b')^2-ac}}{a}\\]")).toEqual(false);
});
test('can not use native MFM for small', () => {
    expect(canUseNativeMFM("<small>foo</small>")).toEqual(false);
});
test('can use native MFM for quote', () => {
    expect(canUseNativeMFM("> foo bar")).toEqual(true);
});
test('can use native MFM for emojiCode', () => {
    expect(canUseNativeMFM(":testEmoji:")).toEqual(true);
});
test('can use native MFM for inlineCode', () => {
    expect(canUseNativeMFM("`<: \"Hello, world!\"`")).toEqual(true);
});
test('can use native MFM for block code', () => {
    expect(canUseNativeMFM(`\`\`\`
~ (#i, 100) {
	<: ? ((i % 15) = 0) "FizzBuzz"
		.? ((i % 3) = 0) "Fizz"
		.? ((i % 5) = 0) "Buzz"
		. i
}
\`\`\`
`)).toEqual(true);
});
test('can not use native MFM for centering', () => {
    expect(canUseNativeMFM("<center>Centered text</center>")).toEqual(false);
    expect(canUseNativeMFM("$[center Centered text]")).toEqual(false);
});
test('can not use native MFM for functions', () => {
    expect(canUseNativeMFM("$[flip foo]")).toEqual(false);
});
test('can use native MFM for plain', () => {
    expect(canUseNativeMFM("<plain>$[flip foo]</plain>")).toEqual(true);
});
