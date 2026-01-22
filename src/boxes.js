(function () {
  var pxProperties = {
    width: true,
    height: true,
    minWidth: true,
    minHeight: true,
    maxWidth: true,
    maxHeight: true,

    top: true,
    right: true,
    bottom: true,
    left: true,

    margin: true,
    marginTop: true,
    marginRight: true,
    marginBottom: true,
    marginLeft: true,

    padding: true,
    paddingTop: true,
    paddingRight: true,
    paddingBottom: true,
    paddingLeft: true,

    borderWidth: true,
    borderTopWidth: true,
    borderRightWidth: true,
    borderBottomWidth: true,
    borderLeftWidth: true,

    borderRadius: true,
    borderTopLeftRadius: true,
    borderTopRightRadius: true,
    borderBottomRightRadius: true,
    borderBottomLeftRadius: true,

    outlineWidth: true,

    fontSize: true,
    letterSpacing: true,
    wordSpacing: true,
    lineHeight: true,

    textIndent: true,

    columnGap: true,
    rowGap: true,
    gap: true,

    columnWidth: true,

    flexBasis: true,

    outlineOffset: true,

    boxShadow: true,
    textShadow: true,

    backgroundSize: true,
    backgroundPosition: true,

    transformOrigin: true,

    objectPosition: true,

    scrollMargin: true,
    scrollMarginTop: true,
    scrollMarginRight: true,
    scrollMarginBottom: true,
    scrollMarginLeft: true,

    scrollPadding: true,
    scrollPaddingTop: true,
    scrollPaddingRight: true,
    scrollPaddingBottom: true,
    scrollPaddingLeft: true,
  };

  function registerBuilder(state, name, builder) {
    if (name in state.builders) {
      throw new Error("Builder already registered: " + name);
    }
    if (typeof builder !== "function") {
      throw new Error("Function expected: " + name);
    }
    state.builders[name] = builder;
  }

  function start(state, spec, container) {
    if (state.started) {
      throw new Error("Already started");
    }
    state.started = true;
    state.rootWidget = buildWidgetTree(state, spec, "0");
    state.rootWidget.container = container;
    state.rootWidget.rect = container.getBoundingClientRect();
    redrawAll(state);
  }

  function redrawAll(state) {
    redrawWidget(state, state.rootWidget);
  }

  function redrawWidget(state, node) {
    var container = node.container;
    var renderContext = createRenderContext(state);
    copyNodeDataToContext(node, renderContext);
    var virtualElement = node.obj.render(renderContext);
    container.innerHTML = "";
    renderWidgetTree(state, renderContext, virtualElement, container);
  }

  function translate(state, textId) {
    var value = state.translations[textId];
    if (value === undefined) {
      console.error("String not translated", textId);
      return textId;
    }
    return value;
  }

  function getGlobal(state, itemId) {
    var value = state.globals[itemId];
    return value;
  }

  function createCallbackContext(state) {
    var self = {};
    self.runFunction = function (nodeId, name, arg) {
      return runFunction(state, nodeId, name, arg);
    };
    self.translate = function (textId) {
      return translate(state, textId);
    };
    self.getGlobal = function (itemId) {
      return getGlobal(state, itemId);
    };
    return self;
  }

  function runFunction(state, nodeId, name, arg) {
    var node = getNode(state, nodeId);
    var method = node.obj[name];
    return method(node.obj.state, arg);
  }

  function createRenderContext(state) {
    return {
      translate: function (textId) {
        return translate(state, textId);
      },
      getGlobal: function (itemId) {
        return getGlobal(state, itemId);
      },
      buildAbsElement: function (nodeId, rect) {
        return buildAbsElement(state, nodeId, rect);
      },
      buildInlineBlockElement: function (nodeId) {
        return buildInlineBlockElement(state, nodeId);
      },
    };
  }

  function buildAbsElement(state, nodeId, rect) {
    var virtualElement = {
      id: nodeId,
      type: "abs",
      rect: rect,
    };
    return renderNode(state, nodeId, rect, virtualElement);
  }

  function renderNode(state, nodeId, rect, virtualElement) {
    var node = getNode(state, nodeId);
    node.rect = rect;
    var renderContext = createRenderContext(state);
    copyNodeDataToContext(node, renderContext);
    var rendered = node.obj.render(renderContext);
    Object.assign(virtualElement, rendered);
    return virtualElement;
  }

  function buildInlineBlockElement(state, nodeId) {
    var virtualElement = {
      id: nodeId,
      type: "inline-block",
      rect: undefined,
    };
    return renderNode(state, nodeId, undefined, virtualElement);
  }

  function renderWidgetTree(state, renderContext, virtualElement, container) {
    setElementId(virtualElement, container);
    updateElement(virtualElement, container);
    bindEvents(state, virtualElement, container);
    if (virtualElement.children) {
      for (var child of virtualElement.children) {
        var element = createElement(child);
        if (child.id) {
          var node = getNode(state, child.id);
          node.container = element;
          node.rect = clone(child.rect);
        }
        container.appendChild(element);
        renderWidgetTree(state, renderContext, child, element);
        if (child.id && child.rememberScroll) {
          handleScroll(node, element);
        }
      }
    }
  }

  function handleScroll(node, element) {
    var scrollX = node.scrollX;
    var scrollY = node.scrollY;
    if (
      (scrollX !== undefined || scrollY !== undefined) &&
      (element.scrollLeft !== scrollX || element.scrollTop !== scrollY)
    ) {
      element.scroll({
        top: scrollY,
        left: scrollX,
        behavior: "instant",
      });
    }
    element.addEventListener("scroll", () => rememberScroll(node, element));
  }

  function rememberScroll(node, element) {
    node.scrollX = element.scrollLeft;
    node.scrollY = element.scrollTop;
  }

  function setElementId(virtualElement, container) {
    if (virtualElement.elementId) {
      container.id = virtualElement.elementId;
    }
  }

  function updateElement(virtualElement, container) {
    setStyle(virtualElement, container);
    setText(virtualElement, container);
  }

  function clone(obj) {
    if (!obj) {
      return obj;
    }
    var copy = {};
    Object.assign(copy, obj);
    return copy;
  }

  function copyNodeDataToContext(node, context) {
    if (!node) {
      return;
    }
    context.id = node.id;
    context.props = node.props;
    context.state = node.obj.state;
    context.rect = node.rect;
    if (node.children) {
      context.children = node.children.slice();
    }
  }

  function clearNodeDataFromContext(context) {
    context.id = undefined;
    context.props = undefined;
    context.state = undefined;
    context.rect = undefined;
    context.children = undefined;
  }

  function createElement(virtualElement) {
    var element;
    if (virtualElement.type === "abs") {
      element = document.createElement("div");
      element.style.position = "absolute";
      element.style.display = "inline-block";
      element.style.left = virtualElement.rect.left + "px";
      element.style.top = virtualElement.rect.top + "px";
      element.style.width = virtualElement.rect.width + "px";
      element.style.height = virtualElement.rect.height + "px";
    } else if (virtualElement.type === "inline-block") {
      element = document.createElement("div");
      element.style.position = "relative";
      element.style.display = "inline-block";
    } else if (virtualElement.type === "tag") {
      element = document.createElement(virtualElement.tag);
      element.style.position = "relative";
    } else {
      throw new Error(
        "Unsupported virtual element type: " + virtualElement.type,
      );
    }
    return element;
  }

  function bindEvent(state, container, eventName, eventInfo, target) {
    var methodName;
    var stopPropagation = false;
    var preventDefault = false;
    var returnFalse = false;
    var capture = false;
    var once = false;
    var passive = false;
    var userData = undefined;
    if (typeof eventInfo === "string") {
      methodName = eventInfo;
    } else if (eventInfo.method) {
      methodName = eventInfo.method;
      stopPropagation = eventInfo.stopPropagation || false;
      preventDefault = eventInfo.preventDefault || false;
      returnFalse = eventInfo.returnFalse || false;
      capture = eventInfo.capture || false;
      once = eventInfo.once || false;
      passive = eventInfo.passive || false;
      userData = eventInfo.userData;
    } else {
      throw new Error("Bad event info");
    }

    var callback = function (event) {
      var eventCopy = copyEvent(event);
      if (userData !== undefined) {
        eventCopy.userData = userData;
      }
      var signal = {
        target: target,
        name: methodName,
        arg: eventCopy,
      };
      if (stopPropagation) {
        event.stopPropagation();
      }
      if (preventDefault) {
        event.preventDefault();
      }
      runCallback(state, signal);
      if (returnFalse) {
        return false;
      }
    };
    var options = {
      capture,
      once,
      passive,
    };
    container.addEventListener(eventName, callback, options);
  }

  function copyEvent(event) {
    var result = {};

    for (var prop in event) {
      var value = event[prop];
      var t = typeof value;
      if (prop === "target" && t === "object") {
        result[prop] = copyTarget(value);
      } else {
        if (t === "string" || t === "number" || t === "boolean") {
          result[prop] = value;
        }
      }
    }
    return result;
  }

  function copyTarget(target) {
    var copy = {};
    copyProp(copy, target, "id");
    copyProp(copy, target, "value");
    copyProp(copy, target, "checked");
    copyProp(copy, target, "text");
    copyProp(copy, target, "tagName");
    return copy;
  }

  function copyProp(target, source, prop) {
    if (prop in source) {
      target[prop] = source[prop];
    }
  }

  function sendMessage(state, target, name, arg) {
    var signal = {
      target: target,
      name: name,
      arg: arg,
    };
    runCallback(state, signal);
  }

  function runCallback(state, signal) {
    var privateContext = { signals: [signal], updateCount: 0 };
    var counter = 0;
    while (privateContext.signals.length > 0) {
      var current = privateContext.signals.shift();
      runCallbackCore(state, current, privateContext);
      counter++;
      if (counter > 1000) {
        throw new Error("Too many emits");
      }
    }

    redrawChanges(state, privateContext);
  }

  function applyDeferredResult(state, result, nodeId) {
    if (!(nodeId in state.nodes)) {
      console.error("Node id not found", nodeId);
      return;
    }

    var signal = {
      target: nodeId,
      result: result,
    };
    runCallback(state, signal);
  }

  function onError(state, nodeId, name, err) {
    var message = "Error";
    if (nodeId && state.nodes[nodeId]) {
      message += " builder:" + state.nodes[nodeId].builderName;
    }
    console.error(message, nodeId, name, err);
  }

  function redrawChanges(state, privateContext) {
    try {
      if (privateContext.redrawAll || privateContext.updateCount > 1) {
        redrawAll(state);
      } else if (privateContext.updateCount === 1) {
        redrawWidget(state, privateContext.nodeToRedraw);
      }
    } catch (ex) {
      onError(state, undefined, "Error during redraw", ex);
    }
  }

  function runCallbackCore(state, signal, privateContext) {
    var nodeId = undefined;
    try {
      nodeId = signal.target;
      var node = getNode(state, nodeId);
      var result;
      if (signal.result) {
        result = signal.result;
      } else {
        var method = node.obj[signal.name];
        if (typeof method !== "function") {
          throw new Error(signal.name + " is not a function");
        }
        var callbackContext = createCallbackContext(state);
        copyNodeDataToContext(node, callbackContext);
        result = method(callbackContext, signal.arg);
        if (result && typeof result.then === "function") {
          result
            .then((value) => applyDeferredResult(state, value, nodeId))
            .catch((err) =>
              onError(state, nodeId, "Async callback error", err),
            );
          return;
        }
      }
      handleCallbackResult(state, result, node, privateContext);
    } catch (ex) {
      onError(state, nodeId, "Async callback error", ex);
    }
  }

  function removeSubtree(state, nodeId) {
    var node = getNode(state, nodeId);
    for (var childId in node.children) {
      removeSubtree(state, childId);
    }
    delete state.nodes[nodeId];
  }

  function handleCallbackResult(state, result, node, privateContext) {
    if (!result) {
      return;
    }

    var redrawMyself = false;
    if (result.setLocalState) {
      redrawMyself = true;
      node.obj.state = result.setLocalState;
    }
    if (result.setChildren) {
      redrawMyself = true;
      node.children.forEach((childId) => removeSubtree(state, childId));
      node.children = result.setChildren.map((childSpec) =>
        buildChild(state, childSpec),
      );
    }
    if (redrawMyself) {
      if (!result.updates || result.updates.length === 0) {
        privateContext.updateCount++;
        privateContext.nodeToRedraw = node;
      }
    }

    if (result.redrawAll) {
      privateContext.redrawAll = true;
    }
    if (result.updates) {
      for (var update of result.updates) {
        var element = document.getElementById(update.elementId);
        updateElement(update, element);
      }
    }
    if (result.emit) {
      for (var secondarySignal of result.emit) {
        privateContext.signals.push(secondarySignal);
      }
    }
  }

  function buildChild(state, childSpec) {
    var node = buildWidgetTree(state, childSpec, "0");
    return node.id;
  }

  function bindEvents(state, virtualElement, container) {
    var events = virtualElement.events;
    if (events) {
      if (!events.target) {
        throw new Error("events must contain a target");
      }
      var target = events.target;
      for (var eventName in events) {
        if (eventName !== "target") {
          var eventInfo = events[eventName];
          bindEvent(state, container, eventName, eventInfo, target);
        }
      }
    }
  }

  function setText(virtualElement, container) {
    if (virtualElement.text) {
      if (container.hasChildNodes()) {
        container.innerHTML = "";
      }
      var textNode = document.createTextNode(virtualElement.text);
      container.appendChild(textNode);
    }
  }

  function setStyle(virtualElement, container) {
    if (virtualElement.style) {
      for (var name in virtualElement.style) {
        var value = virtualElement.style[name];
        var normalized = normalizeStyleValue(name, value);
        container.style[name] = normalized;
      }
    }
    if (virtualElement.className) {
      container.className = virtualElement.className;
    }
    if (virtualElement.elementProps) {
      for (var name in virtualElement.elementProps) {
        var value = virtualElement.elementProps[name];
        container[name] = value;
      }
    }
  }

  function normalizeStyleValue(name, value) {
    if (name in pxProperties) {
      if (typeof value !== "number") {
        throw new Error("A number expected for CSS property: " + name);
      }
      return value + "px";
    }
    return value;
  }

  function buildWidgetTree(state, spec, path) {
    var builderName = spec.builder;
    if (!builderName) {
      throw new Error("builder not specified at: " + path);
    }
    var builder = state.builders[builderName];
    if (typeof builder !== "function") {
      throw new Error(
        'builder "' + builderName + '" is not a function at: ' + path,
      );
    }
    var id;
    if (spec.id) {
      id = spec.id;
    } else {
      id = generateNextId(state);
    }
    var obj = builder(spec.props);
    var node = {
      builderName: builderName,
      id: id,
      obj: obj,
      props: spec.props || {},
      children: [],
    };
    state.nodes[id] = node;
    var i = 0;
    if (spec.children) {
      for (var childSpec of spec.children) {
        var childPath = path + "." + i;
        i++;
        var child = buildWidgetTree(state, childSpec, childPath);
        node.children.push(child.id);
      }
    }
    return node;
  }

  function generateNextId(state) {
    var id = state.nextId;
    state.nextId++;
    return "id" + id;
  }

  function getNode(state, id) {
    var node = state.nodes[id];
    if (!node) {
      throw new Error("Node not found: " + id);
    }
    return node;
  }

  function createBoxes() {
    var state = {
      translations: {},
      globals: {},
      nodes: {},
      started: false,
      builders: {},
      root: undefined,
      nextId: 1,
    };
    return {
      getVersion: function () {
        return "0.0.3";
      },
      registerBuilder: function (name, builder) {
        return registerBuilder(state, name, builder);
      },
      start: function (spec, container) {
        return start(state, spec, container);
      },
      generateNextId: function () {
        return generateNextId(state);
      },
      sendMessage: function (target, name, arg) {
        sendMessage(state, target, name, arg);
      },
      addTranslation: function (textId, text) {
        state.translations[textId] = text;
      },
      setGlobal: function (itemId, value) {
        state.globals[itemId] = value;
      },
    };
  }
  window.createBoxes = createBoxes;
})();
