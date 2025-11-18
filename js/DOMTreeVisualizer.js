class DOMTreeVisualizer {
    constructor(containerId, shadow) {
        this.treeContainer = shadow.querySelector("#pnl_navigator_dom_tree");
        this.treeContainer.setAttribute('tabindex', '0');
        this.currentFocusNode = null;
        this.initCollapseButton();
    }

    init() {
        this.createDOMTree(document.body, this.treeContainer);
        this.addKeyboardNavigation();
        this.preventTagClickBubbling();
    }

    initCollapseButton() {
        const collapseButton = shadow.querySelector('#btn_navigator_collapse');
        if (collapseButton) {
            collapseButton.addEventListener('click', () => this.collapseAll());
        }
    }

    collapseAll() {
        // Get all nodes except the body tag
        const nodes = this.treeContainer.querySelectorAll('.dom-node');
        nodes.forEach(node => {
            const tagName = node.querySelector('.dom-tag');
            if (tagName && tagName.textContent.toLowerCase() === 'body') {
                node.classList.add('collapsed');
            }
        });
    }

    createDOMTree(element, container) {
        if (element.tagName === 'SCRIPT' ||
            element.id === 'dom-tree' ||
            element.id === 'dom-tree-container' ||
            element.tagName === 'STYLE' ||
            element.id === 'pnl_navigator_dom_tree' ||
            element.id === 'inspecta_app_container') {
            return;
        }

        const node = document.createElement('div');
        node.className = 'dom-node collapsed';
        node.dataset.elementPath = this.getElementPath(element);
        node.onmouseenter = () => {
            //this.removeHighlights();

            const originalElement = document.querySelector(node.dataset.elementPath);
            //console.log('originalElement', originalElement);
            if (originalElement) {
                if (typeof window.showHoverOverlay === 'function') {
                    window.showHoverOverlay(originalElement);
                }
            }
            node.classList.add('hovered');
        }
        node.onmouseleave = () => {
            const originalElement = document.querySelector(node.dataset.elementPath);
            if (originalElement && !originalElement.classList.contains('selected')) {
                if (typeof window.hideHoverOverlay === 'function') {
                    window.hideHoverOverlay();
                }
            }
            //node.classList.remove('hovered');
        }

        const contentWrapper = document.createElement('div');
        //contentWrapper.tabIndex = 0;
        contentWrapper.className = 'dom-node-content';

        // contentWrapper.addEventListener('keydown', (e)=> {
        //     console.log('contentWrapper keydown', e.key);
        //     this.keyDownListener(e);
        // });


        contentWrapper.onclick = (e) => {
            // this.isFocused = true;
            // // console.log('contentWrapper clicked');
            this.removeHighlights();
            const originalElement = document.querySelector(node.dataset.elementPath);
            if (originalElement) {
                originalElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }

            // Ensure overlays are initialized
            if (typeof window.initializeOverlays === 'function') {
                window.initializeOverlays();
            }

            // Use the same pattern as color instances popup
            if (typeof window.selectElementForInspecta === 'function') {
                window.selectElementForInspecta(originalElement);
            } else {
                // Fallback to old method
                selectElement(null, originalElement, true);
            }

            if (originalElement) {
                //originalElement.classList.add('highlight');
            }
            setTimeout(() => {
                node.classList.add('selected');
            }, 0);
            node.classList.add('selected');
            e.stopPropagation();
            e.preventDefault();
            //console.log('node.classList', node.classList);
        };

        if (element.children.length > 0) {
            const toggle = document.createElement('span');
            toggle.className = 'dom-toggle';
            toggle.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                <path d="M9 6l6 6-6 6"></path>
            </svg>`;

            toggle.onclick = (e) => {
                e.stopPropagation(); // Prevent event propagation to parent elements
                e.preventDefault();  // Prevent default behavior if necessary
                node.classList.toggle('collapsed');
            };
            contentWrapper.appendChild(toggle);
        } else {
            const spacer = document.createElement('span');
            spacer.style.marginRight = '0px';
            spacer.style.display = 'inline-block';
            spacer.style.width = '16px';
            contentWrapper.appendChild(spacer);
        }

        const tagName = document.createElement('span');
        tagName.className = 'dom-tag';
        tagName.textContent = element.tagName.toLowerCase();
        contentWrapper.appendChild(tagName);

        if (element.attributes && element.attributes.length > 0) {
            const attributes = document.createElement('span');
            attributes.className = 'dom-attributes';
            attributes.textContent = ' ' + Array.from(element.attributes)
                .map(attr => `${attr.name}="${attr.value}"`)
                .join(' ');
            contentWrapper.appendChild(attributes);
        }

        if (element.childNodes.length === 1 && element.firstChild.nodeType === Node.TEXT_NODE) {
            const content = element.textContent.trim();
            if (content) {
                const contentSpan = document.createElement('span');
                contentSpan.className = 'dom-content';
                contentSpan.textContent = ` "${content}"`;
                contentWrapper.appendChild(contentSpan);
            }
        }

        node.appendChild(contentWrapper);

        const childrenContainer = document.createElement('div');
        childrenContainer.className = 'dom-children';
        Array.from(element.children).forEach(child => this.createDOMTree(child, childrenContainer));
        node.appendChild(childrenContainer);
        container?.appendChild(node);
    }

    removeHighlights() {
        document.querySelectorAll('.inspecta-inspect').forEach(el => el.classList.remove('inspecta-inspect'));
        this.treeContainer.querySelectorAll('.dom-node.selected').forEach(el => el.classList.remove('selected'));
        if (this.currentFocusNode) {
            this.currentFocusNode.classList.remove('focused');
        }
    }

    getElementPath(element) {

        return generateElSelector(element);
        let path = [];
        let current = element;
        while (current && current.nodeType === Node.ELEMENT_NODE) {
            let selector = current.nodeName.toLowerCase();
            if (current.id) {
                selector += '#' + current.id;
            } else if (current.className) {
                const classes = current.className.split(' ')
                    .filter(c => c && c !== 'highlight')
                    .join('.');
                if (classes) {
                    selector += '.' + classes;
                }
            }
            if (current.parentElement) {
                const siblings = Array.from(current.parentElement.children)
                    .filter(child => child.tagName === current.tagName);
                const index = siblings.indexOf(current) + 1;
                selector += `:nth-of-type(${index})`;
            }
            path.unshift(selector);
            current = current.parentNode;
        }
        return path.join(' >');
    }

    findNodeByPath(path) {
        return Array.from(this.treeContainer.querySelectorAll('.dom-node'))
            .find(node => {
                //console.log('node.dataset.elementPath', node.dataset.elementPath);
                return node.dataset.elementPath === path
            }) || null;
    }

    setFocus(node) {
        this.removeHighlights();
        this.currentFocusNode = node;
        if (node) {
            node.classList.add('focused');
            const content = node.querySelector('.dom-node-content');

            // Use scrollIntoView with nearest option to ensure smooth scrolling in both directions
            node.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }


    getNextNode(currentNode) {
        if (!currentNode) return null;

        const children = currentNode.querySelector('.dom-children');
        if (children && !currentNode.classList.contains('collapsed')) {
            const firstChild = children.querySelector('.dom-node');
            if (firstChild) return firstChild;
        }

        let next = currentNode.nextElementSibling;
        while (next) {
            if (next.classList.contains('dom-node')) {
                return next;
            }
            next = next.nextElementSibling;
        }

        let parent = currentNode.parentElement;
        while (parent) {
            if (parent.classList.contains('dom-children')) {
                const parentNode = parent.parentElement;
                if (parentNode.classList.contains('dom-node')) {
                    const parentNext = parentNode.nextElementSibling;
                    if (parentNext && parentNext.classList.contains('dom-node')) {
                        return parentNext;
                    }
                }
            }
            parent = parent.parentElement;
        }

        return null;
    }

    getPreviousNode(currentNode) {
        if (!currentNode) return null;

        let prev = currentNode.previousElementSibling;
        while (prev) {
            if (prev.classList.contains('dom-node')) {
                const children = prev.querySelector('.dom-children');
                if (children && !prev.classList.contains('collapsed')) {
                    const childNodes = children.querySelectorAll('.dom-node');
                    if (childNodes.length > 0) {
                        return childNodes[childNodes.length - 1];
                    }
                }
                return prev;
            }
            prev = prev.previousElementSibling;
        }

        let parent = currentNode.parentElement;
        while (parent) {
            if (parent.classList.contains('dom-children')) {
                parent = parent.parentElement;
                if (parent.classList.contains('dom-node')) {
                    return parent;
                }
            }
            parent = parent.parentElement;
        }
        return null;
    }




    keyDownListener(e, stopBubbling = false) {
        if (!this.currentFocusNode) {
            const selectedNode = this.treeContainer.querySelector('.dom-node.selected');
            if (selectedNode) {
                this.currentFocusNode = selectedNode;
            } else {
                const firstNode = this.treeContainer.querySelector('.dom-node');
                if (firstNode) this.setFocus(firstNode);
                return;
            }
        }

        switch (e.key) {
            case 'ArrowRight':
                if (this.currentFocusNode.classList.contains('collapsed')) {
                    this.currentFocusNode.classList.remove('collapsed');
                }
                break;
            case 'ArrowLeft':
                if (!this.currentFocusNode.classList.contains('collapsed')) {
                    this.currentFocusNode.classList.add('collapsed');
                }
                break;
            case 'ArrowDown':
                const nextNode = this.getNextNode(this.currentFocusNode);
                if (nextNode) {
                    this.setFocus(nextNode);
                    const content = nextNode.querySelector('.dom-node-content');
                    content.click();
                }
                break;
            case 'ArrowUp':
                const prevNode = this.getPreviousNode(this.currentFocusNode);
                if (prevNode) {
                    this.setFocus(prevNode);
                    const content = prevNode.querySelector('.dom-node-content');
                    content.click();
                }
                break;
        }
        if (stopBubbling) {
            e.preventDefault();
            e.stopPropagation();
        }
    }

    addKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            this.keyDownListener.bind(this)(e, false);
            this.keyDownListener(e, false);
        });
        this.treeContainer.addEventListener('keydown', (e) => {
            this.keyDownListener.bind(this)(e, true);

        });
        shadow.addEventListener('keydown', (e) => {
            e.stopPropagation();
        });
    }


    addTreeNodeClickHandler() {
        shadow.addEventListener('click', (e) => {
            const nodeContent = e.target.closest('.dom-node-content');
            if (!nodeContent) return;

            const node = nodeContent.parentElement;
            if (!node.classList.contains('dom-node')) return;

            this.removeHighlights();
            const path = node.dataset.elementPath;
            const originalElement = document.querySelector(path);
            if (originalElement) {
                // originalElement.classList.add('highlight');
            }

            node.classList.add('selected');
            node.classList.add('focused');
            this.currentFocusNode = node;
            node.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    }

    preventTagClickBubbling() {
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('dom-tag')) {
                e.stopPropagation();
            }
        });
    }
    show() {
        shadow.querySelector('#pnl_navigator').style.display = 'block';
        this.treeContainer.style.display = 'block';
    }

    hide() {
        shadow.querySelector('#pnl_navigator').style.display = 'none';
        this.treeContainer.style.display = 'none';
    }


    selectTreeNodeBySelector(selectedElement) {

        const path = this.getElementPath(selectedElement);
        const treeNode = this.findNodeByPath(path);
        if (treeNode) {
            this.removeHighlights();
            treeNode.classList.add('selected');
            let currentNode = treeNode;
            while (currentNode) {
                if (currentNode.classList.contains('dom-node')) {
                    currentNode.classList.remove('collapsed');
                }
                currentNode = currentNode.parentElement;
            }
            treeNode.scrollIntoView({ behavior: 'smooth', block: 'center' });
            this.currentFocusNode = treeNode;
        } else {
            //console.warn(`Tree node for selector "${selector}" not found.`);
        }
        let currentNode = treeNode;

    }
}
