(function (){

    function renderTopBottomContainer(renderContext) {
        var rect = renderContext.rect
        var props = renderContext.props
        var children = renderContext.children
        var topRect = {
            width: rect.width,
            height: props.topHeight,
            left: 0,
            top: 0
        }
        var bottomRect = {
            left: 0,
            top: props.topHeight,
            width: rect.width,
            height: rect.height - props.topHeight
        }
        var top = renderContext.buildAbsElement(children[0], topRect)
        var bottom = renderContext.buildAbsElement(children[1], bottomRect)
        return {
            children: [top, bottom]
        }
    }

    function createTopBottomContainer() {
        return {
            render: renderTopBottomContainer
        }
    }

    function createHorizontalContainer() {
        return {
            render: renderHorizontalContainer
        }
    }

    function renderHorizontalContainer(renderContext) {
        var props = renderContext.props
        var children = renderContext.children        
        var childrenUis = []
        for (var child of children) {
            var childUi = renderContext.buildInlineBlockElement(child)
            childUi.style.margin = props.padding
            childrenUis.push(childUi)
        }
        return {
            style: {background: "yellow"},
            children: childrenUis
        }
    }

    function createSolid(props) {
        var background = props.background
        return {
            state: {background: background},
            setColor: function(callbackContext, color) {
                return {
                    setLocalState: {background: color}
                }
            },
            render: function(renderContext) {
                return {
                    style: {background: renderContext.state.background}
                }
            }
        }
    }

    function createDummy(props) {
        var background = props.background
        return {
            state: {background: background},
            render: renderDummy
        }
    }

    function renderDummy(renderContext) {
        return {
            style: {background: renderContext.state.background},
            children: [
                {type: "abs", rect: {left:200, top:20, width:100, height:50}, style: {background:"cyan"}},
                {type: "inline-block", text: "Lorem ipsum", style: {background:"blue", color: "cyan", padding:20}},
                {type: "tag", tag: "div"},
                {type: "tag", tag: "label", style: {margin: 20}, children:[
                    {type: "tag", tag: "input", elementId: "cheese-checkbox", elementProps: {type: "checkbox"}, style: {margin: 20, transform:"scale(2)"}},
                    {type: "tag", tag: "span", text: "I like cheese"}
                ]},
                {type: "tag", tag: "p", children: [
                    {type: "tag", tag: "span", text: "Hello, "},
                    {type: "tag", tag: "strong", text: "world"}
                ]}
            ]
        }
    }

    function pause(ms) {
        return new Promise(resolve => {
            setTimeout(resolve, ms)
        })
    }

    async function changeColor(boxes) {
        for (var i = 0; i < 100; i++) {
            await pause(1000)
            console.log("solid1", "setColor", "red")
            boxes.sendMessage("solid1", "setColor", "red")
            await pause(1000)
            console.log("solid1", "setColor", "black")
            boxes.sendMessage("solid1", "setColor", "black")
        }
    }

    function renderMultiWidget(renderContext) {
        var state = renderContext.state
        var children = renderContext.children
        var active = children[state.active]
        var rect = {
            left: 0,
            top: 0,
            width: renderContext.rect.width,
            height: renderContext.rect.height
        }
        var child = renderContext.buildAbsElement(active, rect)
        return {
            children: [child]
        }
    }

    function createMultiWidget(props) {
        return {
            state: {active: props.active || 0},
            render: renderMultiWidget,          
            setActive: function(callbackContext, active) {
                var oldActive = callbackContext.state.active
                if (oldActive === active) {
                    return undefined
                }
                return {
                    setLocalState: {active:active}
                }
            },
            getActive: function(state) {
                return state.active
            }         
        }
    }

    function makeMainContainerId(callbackContext) {
        return callbackContext.id + "-main-container"
    }

    function createTextButton() {
        return {
            state: {},
            render: renderTextButton,
            click: function(callbackContext) {
                var text = callbackContext.props.text
                return {
                    emit: [{name: callbackContext.props.slot, arg:text}]
                }
            },
            setText: function(callbackContext, text) {
                var eid = makeMainContainerId(callbackContext)
                return {
                    updates: [{elementId: eid, text: text}]
                }
            }
        }
    }

    function renderTextButton(renderContext) {
        var props = renderContext.props
        var style = {
            border: "solid 1px black",
            borderRadius: 3,
            paddingLeft: 5,
            paddingRight: 5,
            lineHeight: 42
        }
        return {
            elementId: makeMainContainerId(renderContext),
            text: props.text,
            className: "button-basis",
            style: style,
            events: {
                target: renderContext.id,
                click: "click"
            }
        }
    }

    function changeSolid(callbackContext) {
        var oldActive = callbackContext.runFunction("multi", "getActive")
        var active, text
        if (oldActive === 0) {
            active = 1
            text = "Moon"
        } else {
            active = 0
            text = "Sun"
        }
        return {
            emit: [
                {target: "multi", name: "setActive", arg:active},
                {target: "btn1", name: "setText", arg: text}
            ]
        }
    }

    function main() {
        var boxes = createBoxes() // create the framework  
        boxes.registerBuilder("createTopBottomContainer", createTopBottomContainer)      
        boxes.registerBuilder("createHorizontalContainer", createHorizontalContainer)      
        boxes.registerBuilder("createTextButton", createTextButton)      
        boxes.registerBuilder("createMultiWidget", createMultiWidget)      
        boxes.registerBuilder("createSolid", createSolid)      
        boxes.registerBuilder("createDummy", createDummy)      
        
        boxes.registerGlobalSlot("changeSolid", changeSolid)
        var uiSpec = {
            builder: "createTopBottomContainer",
            props: {topHeight: 50},
            children: [
                {
                    builder: "createHorizontalContainer",
                    props: {padding: 3},
                    children: [
                        {
                            id: "btn1",
                            builder: "createTextButton",
                            props: {
                                text: "Click me!",
                                slot: "changeSolid"
                            }
                        }
                    ]
                },
                {
                    builder: "createMultiWidget",
                    id: "multi",
                    props: {active: 0},
                    children: [
                        {
                            id: "solid1",
                            builder: "createSolid",
                            props: {background: "orange"}
                        },
                        {
                            builder: "createDummy",
                            props: {
                                background: "orangered"
                            }
                        }
                    ]
                }
            ]
        }
    
    
        var main = document.getElementById("main")
        main.style.display = "inline-block"
        main.style.position = "relative"
        main.style.marginTop = "10px"
        main.style.marginLeft = "10px"
        main.style.width = "800px"
        main.style.height = "600px"
        main.style.background = "green"
        main.innerHTML = ""
        boxes.start(uiSpec, main)
        changeColor(boxes)
    }
    
    main()
})();