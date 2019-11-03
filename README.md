# MultiRecapSFBExtension

## Install

First, import the extension module in ExtensionLoader.ts of your SFB project.

``` typescript
import {MultiRecapExtension} from 'sfb-multi-recap-extension';
```

Then, construct and add an instance of the extension to the list of extensions:

``` typescript
    ...

    constructor(param: ExtensionLoaderParameter) {
        const snippetPath = path.resolve(param.configAccessor.getResourcePath(param.locale), 'Snippets.json');
        const snippetJSON = JSON.parse(fs.readFileSync(snippetPath, "utf8"));
        this.registeredExtensions = [
            ...
            new MultiRecapExtension(param),
            ...
```

Make sure the instance of MultiRecapExtension is before the built-in AlexaExtension in the list, otherwise some of the required storyState changes will not save between requests.

## Use

Once you have this extension installed in your project, you can define recap messages based on number of times the recap has been used.

``` abc
*recap 3
    play this recap message if this recap was hit for the third time.
*recap
    default recap message
```

Make sure you have the catch all handle in your `@global prepend` scene like the following (just copy and paste to your global scene):

``` abc
*then
    ...
    hear * {
        bookmark
        -> bookmark *recap
    }
    ...
```

The default recap/repeat behavior of SFB makes it so that it does not replay the `*then` section to prevent unwanted variable modification on repeat/recap. Defining a `hear *` globally guarantees that the extension's logic is hit everytime.

### Recap Conditions

1. `*recap a`
    Use this as a recap message if it is the `a` time the recap is played.

2. `*recap a...b`
    Use this as a recap message if it is the `a` to `b` times (inclusive) the recap is played.

3. `*recap a, b, c`
    Use this as a recap message if it is the `a`-th, `b`-th, or `c`-th time the recap is played.

4. `*recap`
    Use this as a default recap message. If you are using conditional recap along with default recap, make sure the default recap is defined last. The conditional check happens in order. If the default recap is on the top, the default recap will override other conditional recaps every time.
