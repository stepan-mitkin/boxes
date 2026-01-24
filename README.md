# Boxes

Boxes is a small UI framework where pure functions render DOM and handle messages explicitly without hidden lifecycles or magic.

## Download

https://raw.githubusercontent.com/stepan-mitkin/boxes/main/src/boxes.js

## Current version

0.0.3

## Key principles

* **Rendering is pure**.
  The DOM is described by a pure `render` function, similar in spirit to React.
  Given the same inputs, `render` always produces the same DOM description.

* **Imperative DOM updates**.
  The DOM can be updated surgically without calling `render`.
  If only a small change is needed, Boxes updates exactly that part.

* **Event handlers are pure**.
  Event handlers do not mutate state or touch the DOM directly.

* **Event handlers can be async**.
  Async event handlers may call the server and `await` other long-running operations.

* **Explicit handler semantics**.
  Event handlers follow this shape:

  ```
  (state, argument) → (newState, outputCommands)
  ```

  `outputCommands` may include:

  * messages to other UI nodes
  * surgical DOM updates

Boxes keeps rendering and state changes explicit and separate.


In React, the `render` function is pure and pristine. Everything else is a hack.
React is perfect for static applications where there are no moving parts.
If your app does have moving parts, they go to dirty hacks, such as `useState` and `useEffect`.
That means that your app’s logic must be implemented as dirty hacks.

In **Boxes**, your app’s logic resides in event handlers that are first-class citizens.
Event handlers are pure functions, too.

With **Boxes**, pure functions implement both business logic and rendering.


In short:

* Rendering describes structure.
* Event handlers describe change.


## How Boxes work

### 1. Boxes are logical UI nodes

A **box** is a logical UI object:

* it may have local state
* it can render DOM
* it can surgically update DOM
* it can receive messages
* it can send messages to other boxes

Boxes form a **tree**, defined by a JSON-serializable UI specification.


### 2. State is local and serializable

Each box may define:

```js
state: { ... }
```

Rules:

* state belongs to the box
* state must be JSON-serializable
* state is updated only by returning instructions

No hidden mutations. No magic.


### 3. Rendering is explicit and direct

A box renders by returning a **DOM description object**.

No virtual DOM.
No diffing in user code.

If you want to update text — update text.
If you want to re-render — re-render.


### 4. Messages, not lifecycles

Boxes communicate via **messages**:

* DOM events → box methods
* box methods → instructions
* instructions → state changes, DOM updates, or new box method calls

There are also **functions** (pure queries over state).

No mount. No unmount. No effects.

### 5. Layout is controlled by parents

Parents decide **where children go**.

Children render **into the space they are given**.

This makes layout:

* explicit
* deterministic
* easy to reason about


### 6. Escape hatches are allowed

Boxes intentionally supports:

* direct DOM updates
* imperative message sending
* arbitrary HTML tags

Boxes does **not** try to prevent you from doing real work.


## Using Boxes

### Creating the framework instance

```js
var boxes = createBoxes()
```

### Registering builders

A **builder** constructs a box.

```js
boxes.registerBuilder("createSolid", createSolid)
```

A builder:

* receives `props`
* returns a box object

### Starting the UI

```js
boxes.start(uiSpec, containerElement)
```

* `uiSpec` must be JSON-serializable
* `containerElement` is a DOM node

### Sending messages

To send a message to another object, add messages to the `emit` property of the returned object of the event handler.
Do not use `sendMessage` to send messages from handlers.

`sendMessage` is an escape hatch for long-running multi-stage procedures or recurring jobs.

```js
boxes.sendMessage(targetId, methodName, argument)
```

If `targetId` is `undefined`, the message is sent to a global slot.

## What is a box?

A box is an object returned by a builder.

Example:

```js
function createSolid(props) {
    return {
        state: { background: props.background },

        setColor: function(ctx, color) {
            return {
                setLocalState: { background: color }
            }
        },

        render: function(rc) {
            return {
                style: { background: rc.state.background }
            }
        }
    }
}
```

A box may define:

* `state`
* `render(renderContext)`
* **methods** (message handlers)
* **functions** (pure state queries)

## Methods vs functions

### Functions (pure)

```js
getActive: function(state) {
    return state.active
}
```

* receive `state`
* must not modify anything
* may return any value

Called via:

```js
ctx.runFunction("boxId", "getActive")
```


### Methods (imperative)

```js
setActive: function(ctx, active) {
    return {
        setLocalState: { active }
    }
}
```

* receive `callbackContext`
* must not mutate it
* return **instructions** to the framework


## Instructions returned by methods

A method may return:

### Local state update

```js
{
  setLocalState: { key: value }
}
```

### Emit messages

```js
{
  emit: [
    { target: "boxId", name: "methodName", arg: value }
  ]
}
```


### Direct DOM updates

```js
{
  updates: [
    { elementId: "some-id", text: "New text" }
  ]
}
```

This bypasses re-rendering.


### Replace own children

`setChildren` should be an array of JS-objects that follow the format of UI specification. 

```js
{
  setChildren: [
    {
      builder: "createSubWidget",
      id: "sub-widget-1",
      props: { color: "green" }
    }
  ]
}
```

## Rendering

### The render function

```js
function render(renderContext) {
    return {
        text: "Hello",
        style: { padding: 10 }
    }
}
```

The DOM element already exists.
`render` describes how to configure it.


### renderContext

```js
{
  id,
  props,
  state,
  children,
  rect,
  buildAbsElement,
  buildInlineBlockElement
}
```

### Building child boxes

#### Absolute positioning

```js
var child = renderContext.buildAbsElement(childId, rect)
```

#### Automatic layout (inline-block)

```js
var child = renderContext.buildInlineBlockElement(childId)
```

These calls invoke the child’s `render`.


## Creating DOM elements not bound to boxes

### Absolute element

```js
{
  type: "abs",
  rect: { left: 10, top: 10, width: 100, height: 50 },
  style: { background: "cyan" }
}
```


### Inline element

```js
{
  type: "inline-block",
  text: "Hello"
}
```



### Arbitrary HTML tags

```js
{
  type: "tag",
  tag: "input",
  elementProps: { type: "checkbox" }
}
```

Nested children are supported.


## Example: a text button

```js
function createTextButton() {
    return {
        render: renderTextButton,

        click: function(ctx) {
            return {
                emit: [{ name: ctx.props.slot, arg: ctx.props.text }]
            }
        },

        setText: function(ctx, text) {
            return {
                updates: [{
                    elementId: ctx.id + "-main-container",
                    text
                }]
            }
        }
    }
}
```

This shows:

* DOM events → box methods
* methods → messages or direct DOM updates

## License

Public domain https://unlicense.org

## Feedback

stipan.mitkin@gmail.com
