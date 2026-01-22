(function () {
  function renderTopBottomContainer(renderContext) {
    var rect = renderContext.rect;
    var props = renderContext.props;
    var children = renderContext.children;
    var topRect = {
      width: rect.width,
      height: props.topHeight,
      left: 0,
      top: 0,
    };
    var bottomRect = {
      left: 0,
      top: props.topHeight,
      width: rect.width,
      height: rect.height - props.topHeight,
    };
    var top = renderContext.buildAbsElement(children[0], topRect);
    var bottom = renderContext.buildAbsElement(children[1], bottomRect);
    return {
      children: [top, bottom],
    };
  }

  function createTopBottomContainer() {
    return {
      render: renderTopBottomContainer,
    };
  }

  function createHorizontalContainer() {
    return {
      render: renderHorizontalContainer,
    };
  }

  function renderHorizontalContainer(renderContext) {
    var props = renderContext.props;
    var children = renderContext.children;
    var childrenUis = [];
    for (var child of children) {
      var childUi = renderContext.buildInlineBlockElement(child);
      childUi.style.margin = props.padding;
      childrenUis.push(childUi);
    }
    return {
      style: { background: "yellow" },
      children: childrenUis,
    };
  }

  function buildListWidget() {
    return {
      state: { items: [] },
      addItem: addItemToList,
      render: renderList,
    };
  }

  function renderList(renderContext) {
    var children = [];
    for (var childId of renderContext.children) {
      var childElement = renderContext.buildInlineBlockElement(childId);
      children.push(childElement);
    }
    return {
      rememberScroll: true,
      style: {
        background: "#d0ffd0",
        padding: 10,
        maxHeight: 300,
        overflowY: "auto",
      },
      children: children,
    };
  }

  function addItemToList(callbackContext, item) {
    var list2 = callbackContext.state.items.slice();
    list2.push(item);
    return {
      setLocalState: { items: list2 },
      setChildren: list2.map(textToItem),
    };
  }

  function textToItem(text) {
    return {
      builder: "buildListItem",
      props: { text: text },
    };
  }

  function createDiv() {
    return {
      render: function () {
        return {
          type: "tag",
          tag: "div",
          style: { display: "block" },
        };
      },
    };
  }

  function buildListItem() {
    return {
      render: function (renderContext) {
        var text = renderContext.props.text;
        return {
          style: {
            padding: 20,
            background: "#ffffd0",
            borderBottom: "solid 1px black",
            color: "black",
            display: "block",
          },
          text: text,
        };
      },
    };
  }

  function createSolid(props) {
    var background = props.background;
    return {
      state: { background: background },
      setColor: function (callbackContext, color) {
        return {
          setLocalState: { background: color },
        };
      },
      render: function (renderContext) {
        var children = [];
        if (renderContext.children) {
          children = renderContext.children.map((ch) =>
            renderContext.buildInlineBlockElement(ch),
          );
        }
        return {
          children: children,
          style: { background: renderContext.state.background },
        };
      },
    };
  }

  function createDummy(props) {
    var background = props.background;
    return {
      state: { background: background },
      render: renderDummy,
    };
  }

  function renderDummy(renderContext) {
    return {
      style: { background: renderContext.state.background },
      children: [
        {
          type: "abs",
          rect: { left: 200, top: 20, width: 100, height: 50 },
          style: { background: "cyan" },
        },
        {
          type: "inline-block",
          text: "Lorem ipsum",
          style: { background: "blue", color: "cyan", padding: 20 },
        },
        { type: "tag", tag: "div" },
        {
          type: "tag",
          tag: "label",
          style: { margin: 20 },
          children: [
            {
              type: "tag",
              tag: "input",
              elementId: "cheese-checkbox",
              elementProps: { type: "checkbox" },
              style: { margin: 20, transform: "scale(2)" },
            },
            { type: "tag", tag: "span", text: "I like cheese" },
          ],
        },
        {
          type: "tag",
          tag: "p",
          children: [
            { type: "tag", tag: "span", text: "Hello, " },
            { type: "tag", tag: "strong", text: "world" },
          ],
        },
      ],
    };
  }

  function pause(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  async function changeColor(boxes) {
    for (var i = 0; i < 100; i++) {
      await pause(1000);
      boxes.sendMessage("solid1", "setColor", "red");
      await pause(1000);
      boxes.sendMessage("solid1", "setColor", "black");
    }
  }

  function renderMultiWidget(renderContext) {
    var state = renderContext.state;
    var children = renderContext.children;
    var active = children[state.active];
    var rect = {
      left: 0,
      top: 0,
      width: renderContext.rect.width,
      height: renderContext.rect.height,
    };
    var child = renderContext.buildAbsElement(active, rect);
    return {
      children: [child],
    };
  }

  function createMultiWidget(props) {
    return {
      state: { active: props.active || 0 },
      render: renderMultiWidget,
      setActive: function (callbackContext, active) {
        var oldActive = callbackContext.state.active;
        if (oldActive === active) {
          return undefined;
        }
        return {
          setLocalState: { active: active },
        };
      },
      getActive: function (state) {
        return state.active;
      },
    };
  }

  function makeMainContainerId(callbackContext) {
    return callbackContext.id + "-main-container";
  }

  function createTextButton() {
    return {
      state: {},
      render: renderTextButton,
      click: function (callbackContext, event) {
        console.log("click", event.userData);
        var text = callbackContext.props.text;
        return {
          emit: [
            {
              target: callbackContext.props.target,
              name: callbackContext.props.method,
              arg: text,
            },
          ],
        };
      },
      setText: function (callbackContext, text) {
        var eid = makeMainContainerId(callbackContext);
        return {
          updates: [{ elementId: eid, text: text }],
        };
      },
    };
  }

  function renderTextButton(renderContext) {
    var props = renderContext.props;
    var style = {
      color: renderContext.getGlobal("BUTTON_TEXT"),
      border: "solid 1px black",
      borderRadius: 3,
      paddingLeft: 5,
      paddingRight: 5,
      lineHeight: 42,
    };
    return {
      elementId: makeMainContainerId(renderContext),
      text: renderContext.translate(props.text),
      className: "button-basis",
      style: style,
      events: {
        target: renderContext.id,
        click: {
          method: "click",
          userData: "I am user data",
          stopPropagation: true,
          preventDefault: true,
          returnFalse: true,
          capture: true,
          once: false,
          passive: false,
        },
      },
    };
  }

  function changeSolid(callbackContext) {
    var oldActive = callbackContext.runFunction("multi", "getActive");
    var active, text;
    if (oldActive === 0) {
      active = 1;
      text = "Moon";
    } else {
      active = 0;
      text = "Sun";
    }
    return {
      emit: [
        { target: "multi", name: "setActive", arg: active },
        { target: "btn1", name: "setText", arg: text },
      ],
    };
  }

  function addItem(callbackContext) {
    var text = new Date().toISOString();
    return {
      emit: [{ target: "my-list", name: "addItem", arg: text }],
    };
  }

  function createAppWidget() {
    return {
      addItem: addItem,
      changeSolid: changeSolid,
      render: renderSingleChild,
    };
  }

  function renderSingleChild(renderContext) {
    var rect = {
      left: 0,
      top: 0,
      width: renderContext.rect.width,
      height: renderContext.rect.height,
    };
    var childId = renderContext.children[0];
    var child = renderContext.buildAbsElement(childId, rect);
    return {
      children: [child],
    };
  }

  function main() {
    var boxes = createBoxes(); // create the framework
    boxes.registerBuilder("createTopBottomContainer", createTopBottomContainer);
    boxes.registerBuilder(
      "createHorizontalContainer",
      createHorizontalContainer,
    );
    boxes.registerBuilder("createAppWidget", createAppWidget);
    boxes.registerBuilder("createTextButton", createTextButton);
    boxes.registerBuilder("createMultiWidget", createMultiWidget);
    boxes.registerBuilder("createSolid", createSolid);
    boxes.registerBuilder("createDummy", createDummy);
    boxes.registerBuilder("buildListItem", buildListItem);
    boxes.registerBuilder("buildListWidget", buildListWidget);
    boxes.registerBuilder("createDiv", createDiv);

    boxes.addTranslation("ADD_ITEM", "Add item");
    boxes.addTranslation("CLICK_ME", "Click me");
    boxes.setGlobal("BUTTON_TEXT", "darkred");

    var uiSpec = {
      id: "root",
      builder: "createAppWidget",
      children: [
        {
          builder: "createTopBottomContainer",
          props: { topHeight: 50 },
          children: [
            {
              builder: "createHorizontalContainer",
              props: { padding: 3 },
              children: [
                {
                  id: "btn1",
                  builder: "createTextButton",
                  props: {
                    text: "CLICK_ME",
                    target: "root",
                    method: "changeSolid",
                  },
                },
              ],
            },
            {
              builder: "createMultiWidget",
              id: "multi",
              props: { active: 0 },
              children: [
                {
                  id: "solid1",
                  builder: "createSolid",
                  props: { background: "orange" },
                  children: [
                    {
                      builder: "createTextButton",
                      props: {
                        text: "ADD_ITEM",
                        target: "root",
                        method: "addItem",
                      },
                    },
                    {
                      builder: "createDiv",
                    },
                    {
                      builder: "buildListWidget",
                      id: "my-list",
                    },
                  ],
                },
                {
                  builder: "createDummy",
                  props: {
                    background: "orangered",
                  },
                },
              ],
            },
          ],
        },
      ],
    };

    var main = document.getElementById("main");
    main.style.display = "inline-block";
    main.style.position = "relative";
    main.style.marginTop = "10px";
    main.style.marginLeft = "10px";
    main.style.width = "800px";
    main.style.height = "600px";
    main.style.background = "green";
    main.innerHTML = "";
    boxes.start(uiSpec, main);
    changeColor(boxes);
  }

  main();
})();
