var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function update_slot(slot, slot_definition, ctx, $$scope, dirty, get_slot_changes_fn, get_slot_context_fn) {
        const slot_changes = get_slot_changes(slot_definition, $$scope, dirty, get_slot_changes_fn);
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function prevent_default(fn) {
        return function (event) {
            event.preventDefault();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function set_attributes(node, attributes) {
        // @ts-ignore
        const descriptors = Object.getOwnPropertyDescriptors(node.__proto__);
        for (const key in attributes) {
            if (attributes[key] == null) {
                node.removeAttribute(key);
            }
            else if (key === 'style') {
                node.style.cssText = attributes[key];
            }
            else if (key === '__value') {
                node.value = node[key] = attributes[key];
            }
            else if (descriptors[key] && descriptors[key].set) {
                node[key] = attributes[key];
            }
            else {
                attr(node, key, attributes[key]);
            }
        }
    }
    function set_custom_element_data(node, prop, value) {
        if (prop in node) {
            node[prop] = value;
        }
        else {
            attr(node, prop, value);
        }
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    // unfortunately this can't be a constant as that wouldn't be tree-shakeable
    // so we cache the result instead
    let crossorigin;
    function is_crossorigin() {
        if (crossorigin === undefined) {
            crossorigin = false;
            try {
                if (typeof window !== 'undefined' && window.parent) {
                    void window.parent.document;
                }
            }
            catch (error) {
                crossorigin = true;
            }
        }
        return crossorigin;
    }
    function add_resize_listener(node, fn) {
        const computed_style = getComputedStyle(node);
        const z_index = (parseInt(computed_style.zIndex) || 0) - 1;
        if (computed_style.position === 'static') {
            node.style.position = 'relative';
        }
        const iframe = element('iframe');
        iframe.setAttribute('style', 'display: block; position: absolute; top: 0; left: 0; width: 100%; height: 100%; ' +
            `overflow: hidden; border: 0; opacity: 0; pointer-events: none; z-index: ${z_index};`);
        iframe.setAttribute('aria-hidden', 'true');
        iframe.tabIndex = -1;
        const crossorigin = is_crossorigin();
        let unsubscribe;
        if (crossorigin) {
            iframe.src = "data:text/html,<script>onresize=function(){parent.postMessage(0,'*')}</script>";
            unsubscribe = listen(window, 'message', (event) => {
                if (event.source === iframe.contentWindow)
                    fn();
            });
        }
        else {
            iframe.src = 'about:blank';
            iframe.onload = () => {
                unsubscribe = listen(iframe.contentWindow, 'resize', fn);
            };
        }
        append(node, iframe);
        return () => {
            if (crossorigin) {
                unsubscribe();
            }
            else if (unsubscribe && iframe.contentWindow) {
                unsubscribe();
            }
            detach(iframe);
        };
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }
    class HtmlTag {
        constructor(anchor = null) {
            this.a = anchor;
            this.e = this.n = null;
        }
        m(html, target, anchor = null) {
            if (!this.e) {
                this.e = element(target.nodeName);
                this.t = target;
                this.h(html);
            }
            this.i(anchor);
        }
        h(html) {
            this.e.innerHTML = html;
            this.n = Array.from(this.e.childNodes);
        }
        i(anchor) {
            for (let i = 0; i < this.n.length; i += 1) {
                insert(this.t, this.n[i], anchor);
            }
        }
        p(html) {
            this.d();
            this.h(html);
            this.i(this.a);
        }
        d() {
            this.n.forEach(detach);
        }
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function beforeUpdate(fn) {
        get_current_component().$$.before_update.push(fn);
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function tick() {
        schedule_update();
        return resolved_promise;
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function add_flush_callback(fn) {
        flush_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function outro_and_destroy_block(block, lookup) {
        transition_out(block, 1, 1, () => {
            lookup.delete(block.key);
        });
    }
    function update_keyed_each(old_blocks, dirty, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
        let o = old_blocks.length;
        let n = list.length;
        let i = o;
        const old_indexes = {};
        while (i--)
            old_indexes[old_blocks[i].key] = i;
        const new_blocks = [];
        const new_lookup = new Map();
        const deltas = new Map();
        i = n;
        while (i--) {
            const child_ctx = get_context(ctx, list, i);
            const key = get_key(child_ctx);
            let block = lookup.get(key);
            if (!block) {
                block = create_each_block(key, child_ctx);
                block.c();
            }
            else if (dynamic) {
                block.p(child_ctx, dirty);
            }
            new_lookup.set(key, new_blocks[i] = block);
            if (key in old_indexes)
                deltas.set(key, Math.abs(i - old_indexes[key]));
        }
        const will_move = new Set();
        const did_move = new Set();
        function insert(block) {
            transition_in(block, 1);
            block.m(node, next);
            lookup.set(block.key, block);
            next = block.first;
            n--;
        }
        while (o && n) {
            const new_block = new_blocks[n - 1];
            const old_block = old_blocks[o - 1];
            const new_key = new_block.key;
            const old_key = old_block.key;
            if (new_block === old_block) {
                // do nothing
                next = new_block.first;
                o--;
                n--;
            }
            else if (!new_lookup.has(old_key)) {
                // remove old block
                destroy(old_block, lookup);
                o--;
            }
            else if (!lookup.has(new_key) || will_move.has(new_key)) {
                insert(new_block);
            }
            else if (did_move.has(old_key)) {
                o--;
            }
            else if (deltas.get(new_key) > deltas.get(old_key)) {
                did_move.add(new_key);
                insert(new_block);
            }
            else {
                will_move.add(old_key);
                o--;
            }
        }
        while (o--) {
            const old_block = old_blocks[o];
            if (!new_lookup.has(old_block.key))
                destroy(old_block, lookup);
        }
        while (n)
            insert(new_blocks[n - 1]);
        return new_blocks;
    }
    function validate_each_keys(ctx, list, get_context, get_key) {
        const keys = new Set();
        for (let i = 0; i < list.length; i++) {
            const key = get_key(get_context(ctx, list, i));
            if (keys.has(key)) {
                throw new Error('Cannot have duplicate keys in a keyed each');
            }
            keys.add(key);
        }
    }

    function get_spread_update(levels, updates) {
        const update = {};
        const to_null_out = {};
        const accounted_for = { $$scope: 1 };
        let i = levels.length;
        while (i--) {
            const o = levels[i];
            const n = updates[i];
            if (n) {
                for (const key in o) {
                    if (!(key in n))
                        to_null_out[key] = 1;
                }
                for (const key in n) {
                    if (!accounted_for[key]) {
                        update[key] = n[key];
                        accounted_for[key] = 1;
                    }
                }
                levels[i] = n;
            }
            else {
                for (const key in o) {
                    accounted_for[key] = 1;
                }
            }
        }
        for (const key in to_null_out) {
            if (!(key in update))
                update[key] = undefined;
        }
        return update;
    }
    function get_spread_object(spread_props) {
        return typeof spread_props === 'object' && spread_props !== null ? spread_props : {};
    }

    function bind(component, name, callback) {
        const index = component.$$.props[name];
        if (index !== undefined) {
            component.$$.bound[index] = callback;
            callback(component.$$.ctx[index]);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.31.0' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev('SvelteDOMSetProperty', { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    function isOutOfViewport (elem) {
        const bounding = elem.getBoundingClientRect();
        const out = {};

        out.top = bounding.top < 0;
        out.left = bounding.left < 0;
        out.bottom =
            bounding.bottom >
            (window.innerHeight || document.documentElement.clientHeight);
        out.right =
            bounding.right >
            (window.innerWidth || document.documentElement.clientWidth);
        out.any = out.top || out.left || out.bottom || out.right;

        return out;
    }

    /* node_modules/svelte-select/src/Item.svelte generated by Svelte v3.31.0 */

    const file = "node_modules/svelte-select/src/Item.svelte";

    function create_fragment(ctx) {
    	let div;
    	let raw_value = /*getOptionLabel*/ ctx[0](/*item*/ ctx[1], /*filterText*/ ctx[2]) + "";
    	let div_class_value;

    	const block = {
    		c: function create() {
    			div = element("div");
    			attr_dev(div, "class", div_class_value = "item " + /*itemClasses*/ ctx[3] + " svelte-u0t2tk");
    			add_location(div, file, 70, 0, 1632);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			div.innerHTML = raw_value;
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*getOptionLabel, item, filterText*/ 7 && raw_value !== (raw_value = /*getOptionLabel*/ ctx[0](/*item*/ ctx[1], /*filterText*/ ctx[2]) + "")) div.innerHTML = raw_value;
    			if (dirty & /*itemClasses*/ 8 && div_class_value !== (div_class_value = "item " + /*itemClasses*/ ctx[3] + " svelte-u0t2tk")) {
    				attr_dev(div, "class", div_class_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Item", slots, []);
    	let { isActive = false } = $$props;
    	let { isFirst = false } = $$props;
    	let { isHover = false } = $$props;
    	let { getOptionLabel = undefined } = $$props;
    	let { item = undefined } = $$props;
    	let { filterText = "" } = $$props;
    	let itemClasses = "";
    	const writable_props = ["isActive", "isFirst", "isHover", "getOptionLabel", "item", "filterText"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Item> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("isActive" in $$props) $$invalidate(4, isActive = $$props.isActive);
    		if ("isFirst" in $$props) $$invalidate(5, isFirst = $$props.isFirst);
    		if ("isHover" in $$props) $$invalidate(6, isHover = $$props.isHover);
    		if ("getOptionLabel" in $$props) $$invalidate(0, getOptionLabel = $$props.getOptionLabel);
    		if ("item" in $$props) $$invalidate(1, item = $$props.item);
    		if ("filterText" in $$props) $$invalidate(2, filterText = $$props.filterText);
    	};

    	$$self.$capture_state = () => ({
    		isActive,
    		isFirst,
    		isHover,
    		getOptionLabel,
    		item,
    		filterText,
    		itemClasses
    	});

    	$$self.$inject_state = $$props => {
    		if ("isActive" in $$props) $$invalidate(4, isActive = $$props.isActive);
    		if ("isFirst" in $$props) $$invalidate(5, isFirst = $$props.isFirst);
    		if ("isHover" in $$props) $$invalidate(6, isHover = $$props.isHover);
    		if ("getOptionLabel" in $$props) $$invalidate(0, getOptionLabel = $$props.getOptionLabel);
    		if ("item" in $$props) $$invalidate(1, item = $$props.item);
    		if ("filterText" in $$props) $$invalidate(2, filterText = $$props.filterText);
    		if ("itemClasses" in $$props) $$invalidate(3, itemClasses = $$props.itemClasses);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*isActive, isFirst, isHover, item*/ 114) {
    			 {
    				const classes = [];

    				if (isActive) {
    					classes.push("active");
    				}

    				if (isFirst) {
    					classes.push("first");
    				}

    				if (isHover) {
    					classes.push("hover");
    				}

    				if (item.isGroupHeader) {
    					classes.push("groupHeader");
    				}

    				if (item.isGroupItem) {
    					classes.push("groupItem");
    				}

    				$$invalidate(3, itemClasses = classes.join(" "));
    			}
    		}
    	};

    	return [getOptionLabel, item, filterText, itemClasses, isActive, isFirst, isHover];
    }

    class Item extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance, create_fragment, safe_not_equal, {
    			isActive: 4,
    			isFirst: 5,
    			isHover: 6,
    			getOptionLabel: 0,
    			item: 1,
    			filterText: 2
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Item",
    			options,
    			id: create_fragment.name
    		});
    	}

    	get isActive() {
    		throw new Error("<Item>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set isActive(value) {
    		throw new Error("<Item>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get isFirst() {
    		throw new Error("<Item>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set isFirst(value) {
    		throw new Error("<Item>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get isHover() {
    		throw new Error("<Item>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set isHover(value) {
    		throw new Error("<Item>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get getOptionLabel() {
    		throw new Error("<Item>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set getOptionLabel(value) {
    		throw new Error("<Item>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get item() {
    		throw new Error("<Item>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set item(value) {
    		throw new Error("<Item>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get filterText() {
    		throw new Error("<Item>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set filterText(value) {
    		throw new Error("<Item>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules/svelte-select/src/List.svelte generated by Svelte v3.31.0 */
    const file$1 = "node_modules/svelte-select/src/List.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[41] = list[i];
    	child_ctx[42] = i;
    	return child_ctx;
    }

    // (304:4) {:else}
    function create_else_block(ctx) {
    	let each_1_anchor;
    	let current;
    	let each_value = /*items*/ ctx[1];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	let each_1_else = null;

    	if (!each_value.length) {
    		each_1_else = create_else_block_2(ctx);
    	}

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();

    			if (each_1_else) {
    				each_1_else.c();
    			}
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);

    			if (each_1_else) {
    				each_1_else.m(target, anchor);
    			}

    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*getGroupHeaderLabel, items, handleHover, handleClick, Item, filterText, getOptionLabel, value, optionIdentifier, hoverItemIndex, noOptionsMessage, hideEmptyState*/ 114390) {
    				each_value = /*items*/ ctx[1];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();

    				if (!each_value.length && each_1_else) {
    					each_1_else.p(ctx, dirty);
    				} else if (!each_value.length) {
    					each_1_else = create_else_block_2(ctx);
    					each_1_else.c();
    					each_1_else.m(each_1_anchor.parentNode, each_1_anchor);
    				} else if (each_1_else) {
    					each_1_else.d(1);
    					each_1_else = null;
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    			if (each_1_else) each_1_else.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(304:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (282:4) {#if isVirtualList}
    function create_if_block(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;
    	var switch_value = /*VirtualList*/ ctx[3];

    	function switch_props(ctx) {
    		return {
    			props: {
    				items: /*items*/ ctx[1],
    				itemHeight: /*itemHeight*/ ctx[8],
    				$$slots: {
    					default: [
    						create_default_slot,
    						({ item, i }) => ({ 41: item, 42: i }),
    						({ item, i }) => [0, (item ? 1024 : 0) | (i ? 2048 : 0)]
    					]
    				},
    				$$scope: { ctx }
    			},
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props(ctx));
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert_dev(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const switch_instance_changes = {};
    			if (dirty[0] & /*items*/ 2) switch_instance_changes.items = /*items*/ ctx[1];
    			if (dirty[0] & /*itemHeight*/ 256) switch_instance_changes.itemHeight = /*itemHeight*/ ctx[8];

    			if (dirty[0] & /*Item, filterText, getOptionLabel, value, optionIdentifier, hoverItemIndex, items*/ 9814 | dirty[1] & /*$$scope, item, i*/ 11264) {
    				switch_instance_changes.$$scope = { dirty, ctx };
    			}

    			if (switch_value !== (switch_value = /*VirtualList*/ ctx[3])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props(ctx));
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(282:4) {#if isVirtualList}",
    		ctx
    	});

    	return block;
    }

    // (325:8) {:else}
    function create_else_block_2(ctx) {
    	let if_block_anchor;
    	let if_block = !/*hideEmptyState*/ ctx[11] && create_if_block_2(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (!/*hideEmptyState*/ ctx[11]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_2(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_2.name,
    		type: "else",
    		source: "(325:8) {:else}",
    		ctx
    	});

    	return block;
    }

    // (326:12) {#if !hideEmptyState}
    function create_if_block_2(ctx) {
    	let div;
    	let t;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t = text(/*noOptionsMessage*/ ctx[12]);
    			attr_dev(div, "class", "empty svelte-1uyqfml");
    			add_location(div, file$1, 326, 16, 9962);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*noOptionsMessage*/ 4096) set_data_dev(t, /*noOptionsMessage*/ ctx[12]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(326:12) {#if !hideEmptyState}",
    		ctx
    	});

    	return block;
    }

    // (308:12) {:else}
    function create_else_block_1(ctx) {
    	let div;
    	let switch_instance;
    	let t;
    	let current;
    	let mounted;
    	let dispose;
    	var switch_value = /*Item*/ ctx[4];

    	function switch_props(ctx) {
    		return {
    			props: {
    				item: /*item*/ ctx[41],
    				filterText: /*filterText*/ ctx[13],
    				getOptionLabel: /*getOptionLabel*/ ctx[6],
    				isFirst: isItemFirst(/*i*/ ctx[42]),
    				isActive: isItemActive(/*item*/ ctx[41], /*value*/ ctx[9], /*optionIdentifier*/ ctx[10]),
    				isHover: isItemHover(/*hoverItemIndex*/ ctx[2], /*item*/ ctx[41], /*i*/ ctx[42], /*items*/ ctx[1])
    			},
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props(ctx));
    	}

    	function mouseover_handler_1() {
    		return /*mouseover_handler_1*/ ctx[29](/*i*/ ctx[42]);
    	}

    	function focus_handler_1() {
    		return /*focus_handler_1*/ ctx[30](/*i*/ ctx[42]);
    	}

    	function click_handler_1(...args) {
    		return /*click_handler_1*/ ctx[31](/*item*/ ctx[41], /*i*/ ctx[42], ...args);
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			t = space();
    			attr_dev(div, "class", "listItem");
    			attr_dev(div, "tabindex", "-1");
    			add_location(div, file$1, 308, 16, 9204);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			if (switch_instance) {
    				mount_component(switch_instance, div, null);
    			}

    			append_dev(div, t);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(div, "mouseover", mouseover_handler_1, false, false, false),
    					listen_dev(div, "focus", focus_handler_1, false, false, false),
    					listen_dev(div, "click", click_handler_1, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			const switch_instance_changes = {};
    			if (dirty[0] & /*items*/ 2) switch_instance_changes.item = /*item*/ ctx[41];
    			if (dirty[0] & /*filterText*/ 8192) switch_instance_changes.filterText = /*filterText*/ ctx[13];
    			if (dirty[0] & /*getOptionLabel*/ 64) switch_instance_changes.getOptionLabel = /*getOptionLabel*/ ctx[6];
    			if (dirty[0] & /*items, value, optionIdentifier*/ 1538) switch_instance_changes.isActive = isItemActive(/*item*/ ctx[41], /*value*/ ctx[9], /*optionIdentifier*/ ctx[10]);
    			if (dirty[0] & /*hoverItemIndex, items*/ 6) switch_instance_changes.isHover = isItemHover(/*hoverItemIndex*/ ctx[2], /*item*/ ctx[41], /*i*/ ctx[42], /*items*/ ctx[1]);

    			if (switch_value !== (switch_value = /*Item*/ ctx[4])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props(ctx));
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, div, t);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (switch_instance) destroy_component(switch_instance);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1.name,
    		type: "else",
    		source: "(308:12) {:else}",
    		ctx
    	});

    	return block;
    }

    // (306:12) {#if item.isGroupHeader && !item.isSelectable}
    function create_if_block_1(ctx) {
    	let div;
    	let t_value = /*getGroupHeaderLabel*/ ctx[7](/*item*/ ctx[41]) + "";
    	let t;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t = text(t_value);
    			attr_dev(div, "class", "listGroupTitle svelte-1uyqfml");
    			add_location(div, file$1, 306, 16, 9106);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*getGroupHeaderLabel, items*/ 130 && t_value !== (t_value = /*getGroupHeaderLabel*/ ctx[7](/*item*/ ctx[41]) + "")) set_data_dev(t, t_value);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(306:12) {#if item.isGroupHeader && !item.isSelectable}",
    		ctx
    	});

    	return block;
    }

    // (305:8) {#each items as item, i}
    function create_each_block(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block_1, create_else_block_1];
    	const if_blocks = [];

    	function select_block_type_1(ctx, dirty) {
    		if (/*item*/ ctx[41].isGroupHeader && !/*item*/ ctx[41].isSelectable) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type_1(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type_1(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(305:8) {#each items as item, i}",
    		ctx
    	});

    	return block;
    }

    // (283:8) <svelte:component             this={VirtualList}             {items}             {itemHeight}             let:item             let:i>
    function create_default_slot(ctx) {
    	let div;
    	let switch_instance;
    	let current;
    	let mounted;
    	let dispose;
    	var switch_value = /*Item*/ ctx[4];

    	function switch_props(ctx) {
    		return {
    			props: {
    				item: /*item*/ ctx[41],
    				filterText: /*filterText*/ ctx[13],
    				getOptionLabel: /*getOptionLabel*/ ctx[6],
    				isFirst: isItemFirst(/*i*/ ctx[42]),
    				isActive: isItemActive(/*item*/ ctx[41], /*value*/ ctx[9], /*optionIdentifier*/ ctx[10]),
    				isHover: isItemHover(/*hoverItemIndex*/ ctx[2], /*item*/ ctx[41], /*i*/ ctx[42], /*items*/ ctx[1])
    			},
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props(ctx));
    	}

    	function mouseover_handler() {
    		return /*mouseover_handler*/ ctx[26](/*i*/ ctx[42]);
    	}

    	function focus_handler() {
    		return /*focus_handler*/ ctx[27](/*i*/ ctx[42]);
    	}

    	function click_handler(...args) {
    		return /*click_handler*/ ctx[28](/*item*/ ctx[41], /*i*/ ctx[42], ...args);
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			attr_dev(div, "class", "listItem");
    			add_location(div, file$1, 288, 12, 8370);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			if (switch_instance) {
    				mount_component(switch_instance, div, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(div, "mouseover", mouseover_handler, false, false, false),
    					listen_dev(div, "focus", focus_handler, false, false, false),
    					listen_dev(div, "click", click_handler, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			const switch_instance_changes = {};
    			if (dirty[1] & /*item*/ 1024) switch_instance_changes.item = /*item*/ ctx[41];
    			if (dirty[0] & /*filterText*/ 8192) switch_instance_changes.filterText = /*filterText*/ ctx[13];
    			if (dirty[0] & /*getOptionLabel*/ 64) switch_instance_changes.getOptionLabel = /*getOptionLabel*/ ctx[6];
    			if (dirty[1] & /*i*/ 2048) switch_instance_changes.isFirst = isItemFirst(/*i*/ ctx[42]);
    			if (dirty[0] & /*value, optionIdentifier*/ 1536 | dirty[1] & /*item*/ 1024) switch_instance_changes.isActive = isItemActive(/*item*/ ctx[41], /*value*/ ctx[9], /*optionIdentifier*/ ctx[10]);
    			if (dirty[0] & /*hoverItemIndex, items*/ 6 | dirty[1] & /*item, i*/ 3072) switch_instance_changes.isHover = isItemHover(/*hoverItemIndex*/ ctx[2], /*item*/ ctx[41], /*i*/ ctx[42], /*items*/ ctx[1]);

    			if (switch_value !== (switch_value = /*Item*/ ctx[4])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props(ctx));
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, div, null);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (switch_instance) destroy_component(switch_instance);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot.name,
    		type: "slot",
    		source: "(283:8) <svelte:component             this={VirtualList}             {items}             {itemHeight}             let:item             let:i>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let div;
    	let current_block_type_index;
    	let if_block;
    	let current;
    	let mounted;
    	let dispose;
    	const if_block_creators = [create_if_block, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*isVirtualList*/ ctx[5]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if_block.c();
    			attr_dev(div, "class", "listContainer svelte-1uyqfml");
    			attr_dev(div, "style", /*listStyle*/ ctx[14]);
    			toggle_class(div, "virtualList", /*isVirtualList*/ ctx[5]);
    			add_location(div, file$1, 276, 0, 8074);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			if_blocks[current_block_type_index].m(div, null);
    			/*div_binding*/ ctx[32](div);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(window, "keydown", /*handleKeyDown*/ ctx[17], false, false, false),
    					listen_dev(window, "resize", /*computePlacement*/ ctx[18], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(div, null);
    			}

    			if (!current || dirty[0] & /*listStyle*/ 16384) {
    				attr_dev(div, "style", /*listStyle*/ ctx[14]);
    			}

    			if (dirty[0] & /*isVirtualList*/ 32) {
    				toggle_class(div, "virtualList", /*isVirtualList*/ ctx[5]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if_blocks[current_block_type_index].d();
    			/*div_binding*/ ctx[32](null);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function isItemActive(item, value, optionIdentifier) {
    	return value && value[optionIdentifier] === item[optionIdentifier];
    }

    function isItemFirst(itemIndex) {
    	return itemIndex === 0;
    }

    function isItemHover(hoverItemIndex, item, itemIndex, items) {
    	return hoverItemIndex === itemIndex || items.length === 1;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("List", slots, []);
    	const dispatch = createEventDispatcher();
    	let { container = undefined } = $$props;
    	let { VirtualList = null } = $$props;
    	let { Item: Item$1 = Item } = $$props;
    	let { isVirtualList = false } = $$props;
    	let { items = [] } = $$props;
    	let { labelIdentifier = "label" } = $$props;

    	let { getOptionLabel = (option, filterText) => {
    		if (option) return option.isCreator
    		? `Create \"${filterText}\"`
    		: option[labelIdentifier];
    	} } = $$props;

    	let { getGroupHeaderLabel = null } = $$props;
    	let { itemHeight = 40 } = $$props;
    	let { hoverItemIndex = 0 } = $$props;
    	let { value = undefined } = $$props;
    	let { optionIdentifier = "value" } = $$props;
    	let { hideEmptyState = false } = $$props;
    	let { noOptionsMessage = "No options" } = $$props;
    	let { isMulti = false } = $$props;
    	let { activeItemIndex = 0 } = $$props;
    	let { filterText = "" } = $$props;
    	let { parent = null } = $$props;
    	let { listPlacement = null } = $$props;
    	let { listAutoWidth = null } = $$props;
    	let { listOffset = 5 } = $$props;
    	let isScrollingTimer = 0;
    	let isScrolling = false;
    	let prev_items;

    	onMount(() => {
    		if (items.length > 0 && !isMulti && value) {
    			const _hoverItemIndex = items.findIndex(item => item[optionIdentifier] === value[optionIdentifier]);

    			if (_hoverItemIndex) {
    				$$invalidate(2, hoverItemIndex = _hoverItemIndex);
    			}
    		}

    		scrollToActiveItem("active");

    		container.addEventListener(
    			"scroll",
    			() => {
    				clearTimeout(isScrollingTimer);

    				isScrollingTimer = setTimeout(
    					() => {
    						isScrolling = false;
    					},
    					100
    				);
    			},
    			false
    		);
    	});

    	beforeUpdate(() => {
    		if (!items) $$invalidate(1, items = []);

    		if (items !== prev_items && items.length > 0) {
    			$$invalidate(2, hoverItemIndex = 0);
    		}

    		prev_items = items;
    	});

    	function handleSelect(item) {
    		if (item.isCreator) return;
    		dispatch("itemSelected", item);
    	}

    	function handleHover(i) {
    		if (isScrolling) return;
    		$$invalidate(2, hoverItemIndex = i);
    	}

    	function handleClick(args) {
    		const { item, i, event } = args;
    		event.stopPropagation();
    		if (value && !isMulti && value[optionIdentifier] === item[optionIdentifier]) return closeList();

    		if (item.isCreator) {
    			dispatch("itemCreated", filterText);
    		} else {
    			$$invalidate(19, activeItemIndex = i);
    			$$invalidate(2, hoverItemIndex = i);
    			handleSelect(item);
    		}
    	}

    	function closeList() {
    		dispatch("closeList");
    	}

    	async function updateHoverItem(increment) {
    		if (isVirtualList) return;
    		let isNonSelectableItem = true;

    		while (isNonSelectableItem) {
    			if (increment > 0 && hoverItemIndex === items.length - 1) {
    				$$invalidate(2, hoverItemIndex = 0);
    			} else if (increment < 0 && hoverItemIndex === 0) {
    				$$invalidate(2, hoverItemIndex = items.length - 1);
    			} else {
    				$$invalidate(2, hoverItemIndex = hoverItemIndex + increment);
    			}

    			isNonSelectableItem = items[hoverItemIndex].isGroupHeader && !items[hoverItemIndex].isSelectable;
    		}

    		await tick();
    		scrollToActiveItem("hover");
    	}

    	function handleKeyDown(e) {
    		switch (e.key) {
    			case "Escape":
    				e.preventDefault();
    				closeList();
    				break;
    			case "ArrowDown":
    				e.preventDefault();
    				items.length && updateHoverItem(1);
    				break;
    			case "ArrowUp":
    				e.preventDefault();
    				items.length && updateHoverItem(-1);
    				break;
    			case "Enter":
    				e.preventDefault();
    				if (items.length === 0) break;
    				const hoverItem = items[hoverItemIndex];
    				if (value && !isMulti && value[optionIdentifier] === hoverItem[optionIdentifier]) {
    					closeList();
    					break;
    				}
    				if (hoverItem.isCreator) {
    					dispatch("itemCreated", filterText);
    				} else {
    					$$invalidate(19, activeItemIndex = hoverItemIndex);
    					handleSelect(items[hoverItemIndex]);
    				}
    				break;
    			case "Tab":
    				e.preventDefault();
    				if (items.length === 0) {
    					return closeList();
    				}
    				if (value && value[optionIdentifier] === items[hoverItemIndex][optionIdentifier]) return closeList();
    				$$invalidate(19, activeItemIndex = hoverItemIndex);
    				handleSelect(items[hoverItemIndex]);
    				break;
    		}
    	}

    	function scrollToActiveItem(className) {
    		if (isVirtualList || !container) return;
    		let offsetBounding;
    		const focusedElemBounding = container.querySelector(`.listItem .${className}`);

    		if (focusedElemBounding) {
    			offsetBounding = container.getBoundingClientRect().bottom - focusedElemBounding.getBoundingClientRect().bottom;
    		}

    		$$invalidate(0, container.scrollTop -= offsetBounding, container);
    	}

    	let listStyle;

    	function computePlacement() {
    		const { top, height, width } = parent.getBoundingClientRect();
    		$$invalidate(14, listStyle = "");
    		$$invalidate(14, listStyle += `min-width:${width}px;width:${listAutoWidth ? "auto" : "100%"};`);

    		if (listPlacement === "top" || listPlacement === "auto" && isOutOfViewport(parent).bottom) {
    			$$invalidate(14, listStyle += `bottom:${height + listOffset}px;`);
    		} else {
    			$$invalidate(14, listStyle += `top:${height + listOffset}px;`);
    		}
    	}

    	const writable_props = [
    		"container",
    		"VirtualList",
    		"Item",
    		"isVirtualList",
    		"items",
    		"labelIdentifier",
    		"getOptionLabel",
    		"getGroupHeaderLabel",
    		"itemHeight",
    		"hoverItemIndex",
    		"value",
    		"optionIdentifier",
    		"hideEmptyState",
    		"noOptionsMessage",
    		"isMulti",
    		"activeItemIndex",
    		"filterText",
    		"parent",
    		"listPlacement",
    		"listAutoWidth",
    		"listOffset"
    	];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<List> was created with unknown prop '${key}'`);
    	});

    	const mouseover_handler = i => handleHover(i);
    	const focus_handler = i => handleHover(i);
    	const click_handler = (item, i, event) => handleClick({ item, i, event });
    	const mouseover_handler_1 = i => handleHover(i);
    	const focus_handler_1 = i => handleHover(i);
    	const click_handler_1 = (item, i, event) => handleClick({ item, i, event });

    	function div_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			container = $$value;
    			$$invalidate(0, container);
    		});
    	}

    	$$self.$$set = $$props => {
    		if ("container" in $$props) $$invalidate(0, container = $$props.container);
    		if ("VirtualList" in $$props) $$invalidate(3, VirtualList = $$props.VirtualList);
    		if ("Item" in $$props) $$invalidate(4, Item$1 = $$props.Item);
    		if ("isVirtualList" in $$props) $$invalidate(5, isVirtualList = $$props.isVirtualList);
    		if ("items" in $$props) $$invalidate(1, items = $$props.items);
    		if ("labelIdentifier" in $$props) $$invalidate(20, labelIdentifier = $$props.labelIdentifier);
    		if ("getOptionLabel" in $$props) $$invalidate(6, getOptionLabel = $$props.getOptionLabel);
    		if ("getGroupHeaderLabel" in $$props) $$invalidate(7, getGroupHeaderLabel = $$props.getGroupHeaderLabel);
    		if ("itemHeight" in $$props) $$invalidate(8, itemHeight = $$props.itemHeight);
    		if ("hoverItemIndex" in $$props) $$invalidate(2, hoverItemIndex = $$props.hoverItemIndex);
    		if ("value" in $$props) $$invalidate(9, value = $$props.value);
    		if ("optionIdentifier" in $$props) $$invalidate(10, optionIdentifier = $$props.optionIdentifier);
    		if ("hideEmptyState" in $$props) $$invalidate(11, hideEmptyState = $$props.hideEmptyState);
    		if ("noOptionsMessage" in $$props) $$invalidate(12, noOptionsMessage = $$props.noOptionsMessage);
    		if ("isMulti" in $$props) $$invalidate(21, isMulti = $$props.isMulti);
    		if ("activeItemIndex" in $$props) $$invalidate(19, activeItemIndex = $$props.activeItemIndex);
    		if ("filterText" in $$props) $$invalidate(13, filterText = $$props.filterText);
    		if ("parent" in $$props) $$invalidate(22, parent = $$props.parent);
    		if ("listPlacement" in $$props) $$invalidate(23, listPlacement = $$props.listPlacement);
    		if ("listAutoWidth" in $$props) $$invalidate(24, listAutoWidth = $$props.listAutoWidth);
    		if ("listOffset" in $$props) $$invalidate(25, listOffset = $$props.listOffset);
    	};

    	$$self.$capture_state = () => ({
    		beforeUpdate,
    		createEventDispatcher,
    		onMount,
    		tick,
    		isOutOfViewport,
    		ItemComponent: Item,
    		dispatch,
    		container,
    		VirtualList,
    		Item: Item$1,
    		isVirtualList,
    		items,
    		labelIdentifier,
    		getOptionLabel,
    		getGroupHeaderLabel,
    		itemHeight,
    		hoverItemIndex,
    		value,
    		optionIdentifier,
    		hideEmptyState,
    		noOptionsMessage,
    		isMulti,
    		activeItemIndex,
    		filterText,
    		parent,
    		listPlacement,
    		listAutoWidth,
    		listOffset,
    		isScrollingTimer,
    		isScrolling,
    		prev_items,
    		handleSelect,
    		handleHover,
    		handleClick,
    		closeList,
    		updateHoverItem,
    		handleKeyDown,
    		scrollToActiveItem,
    		isItemActive,
    		isItemFirst,
    		isItemHover,
    		listStyle,
    		computePlacement
    	});

    	$$self.$inject_state = $$props => {
    		if ("container" in $$props) $$invalidate(0, container = $$props.container);
    		if ("VirtualList" in $$props) $$invalidate(3, VirtualList = $$props.VirtualList);
    		if ("Item" in $$props) $$invalidate(4, Item$1 = $$props.Item);
    		if ("isVirtualList" in $$props) $$invalidate(5, isVirtualList = $$props.isVirtualList);
    		if ("items" in $$props) $$invalidate(1, items = $$props.items);
    		if ("labelIdentifier" in $$props) $$invalidate(20, labelIdentifier = $$props.labelIdentifier);
    		if ("getOptionLabel" in $$props) $$invalidate(6, getOptionLabel = $$props.getOptionLabel);
    		if ("getGroupHeaderLabel" in $$props) $$invalidate(7, getGroupHeaderLabel = $$props.getGroupHeaderLabel);
    		if ("itemHeight" in $$props) $$invalidate(8, itemHeight = $$props.itemHeight);
    		if ("hoverItemIndex" in $$props) $$invalidate(2, hoverItemIndex = $$props.hoverItemIndex);
    		if ("value" in $$props) $$invalidate(9, value = $$props.value);
    		if ("optionIdentifier" in $$props) $$invalidate(10, optionIdentifier = $$props.optionIdentifier);
    		if ("hideEmptyState" in $$props) $$invalidate(11, hideEmptyState = $$props.hideEmptyState);
    		if ("noOptionsMessage" in $$props) $$invalidate(12, noOptionsMessage = $$props.noOptionsMessage);
    		if ("isMulti" in $$props) $$invalidate(21, isMulti = $$props.isMulti);
    		if ("activeItemIndex" in $$props) $$invalidate(19, activeItemIndex = $$props.activeItemIndex);
    		if ("filterText" in $$props) $$invalidate(13, filterText = $$props.filterText);
    		if ("parent" in $$props) $$invalidate(22, parent = $$props.parent);
    		if ("listPlacement" in $$props) $$invalidate(23, listPlacement = $$props.listPlacement);
    		if ("listAutoWidth" in $$props) $$invalidate(24, listAutoWidth = $$props.listAutoWidth);
    		if ("listOffset" in $$props) $$invalidate(25, listOffset = $$props.listOffset);
    		if ("isScrollingTimer" in $$props) isScrollingTimer = $$props.isScrollingTimer;
    		if ("isScrolling" in $$props) isScrolling = $$props.isScrolling;
    		if ("prev_items" in $$props) prev_items = $$props.prev_items;
    		if ("listStyle" in $$props) $$invalidate(14, listStyle = $$props.listStyle);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*parent, container*/ 4194305) {
    			 {
    				if (parent && container) computePlacement();
    			}
    		}
    	};

    	return [
    		container,
    		items,
    		hoverItemIndex,
    		VirtualList,
    		Item$1,
    		isVirtualList,
    		getOptionLabel,
    		getGroupHeaderLabel,
    		itemHeight,
    		value,
    		optionIdentifier,
    		hideEmptyState,
    		noOptionsMessage,
    		filterText,
    		listStyle,
    		handleHover,
    		handleClick,
    		handleKeyDown,
    		computePlacement,
    		activeItemIndex,
    		labelIdentifier,
    		isMulti,
    		parent,
    		listPlacement,
    		listAutoWidth,
    		listOffset,
    		mouseover_handler,
    		focus_handler,
    		click_handler,
    		mouseover_handler_1,
    		focus_handler_1,
    		click_handler_1,
    		div_binding
    	];
    }

    class List extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(
    			this,
    			options,
    			instance$1,
    			create_fragment$1,
    			safe_not_equal,
    			{
    				container: 0,
    				VirtualList: 3,
    				Item: 4,
    				isVirtualList: 5,
    				items: 1,
    				labelIdentifier: 20,
    				getOptionLabel: 6,
    				getGroupHeaderLabel: 7,
    				itemHeight: 8,
    				hoverItemIndex: 2,
    				value: 9,
    				optionIdentifier: 10,
    				hideEmptyState: 11,
    				noOptionsMessage: 12,
    				isMulti: 21,
    				activeItemIndex: 19,
    				filterText: 13,
    				parent: 22,
    				listPlacement: 23,
    				listAutoWidth: 24,
    				listOffset: 25
    			},
    			[-1, -1]
    		);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "List",
    			options,
    			id: create_fragment$1.name
    		});
    	}

    	get container() {
    		throw new Error("<List>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set container(value) {
    		throw new Error("<List>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get VirtualList() {
    		throw new Error("<List>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set VirtualList(value) {
    		throw new Error("<List>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get Item() {
    		throw new Error("<List>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set Item(value) {
    		throw new Error("<List>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get isVirtualList() {
    		throw new Error("<List>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set isVirtualList(value) {
    		throw new Error("<List>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get items() {
    		throw new Error("<List>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set items(value) {
    		throw new Error("<List>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get labelIdentifier() {
    		throw new Error("<List>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set labelIdentifier(value) {
    		throw new Error("<List>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get getOptionLabel() {
    		throw new Error("<List>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set getOptionLabel(value) {
    		throw new Error("<List>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get getGroupHeaderLabel() {
    		throw new Error("<List>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set getGroupHeaderLabel(value) {
    		throw new Error("<List>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get itemHeight() {
    		throw new Error("<List>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set itemHeight(value) {
    		throw new Error("<List>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get hoverItemIndex() {
    		throw new Error("<List>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set hoverItemIndex(value) {
    		throw new Error("<List>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get value() {
    		throw new Error("<List>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set value(value) {
    		throw new Error("<List>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get optionIdentifier() {
    		throw new Error("<List>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set optionIdentifier(value) {
    		throw new Error("<List>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get hideEmptyState() {
    		throw new Error("<List>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set hideEmptyState(value) {
    		throw new Error("<List>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get noOptionsMessage() {
    		throw new Error("<List>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set noOptionsMessage(value) {
    		throw new Error("<List>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get isMulti() {
    		throw new Error("<List>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set isMulti(value) {
    		throw new Error("<List>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get activeItemIndex() {
    		throw new Error("<List>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set activeItemIndex(value) {
    		throw new Error("<List>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get filterText() {
    		throw new Error("<List>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set filterText(value) {
    		throw new Error("<List>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get parent() {
    		throw new Error("<List>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set parent(value) {
    		throw new Error("<List>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get listPlacement() {
    		throw new Error("<List>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set listPlacement(value) {
    		throw new Error("<List>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get listAutoWidth() {
    		throw new Error("<List>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set listAutoWidth(value) {
    		throw new Error("<List>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get listOffset() {
    		throw new Error("<List>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set listOffset(value) {
    		throw new Error("<List>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules/svelte-select/src/Selection.svelte generated by Svelte v3.31.0 */

    const file$2 = "node_modules/svelte-select/src/Selection.svelte";

    function create_fragment$2(ctx) {
    	let div;
    	let raw_value = /*getSelectionLabel*/ ctx[0](/*item*/ ctx[1]) + "";

    	const block = {
    		c: function create() {
    			div = element("div");
    			attr_dev(div, "class", "selection svelte-pu1q1n");
    			add_location(div, file$2, 13, 0, 230);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			div.innerHTML = raw_value;
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*getSelectionLabel, item*/ 3 && raw_value !== (raw_value = /*getSelectionLabel*/ ctx[0](/*item*/ ctx[1]) + "")) div.innerHTML = raw_value;		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Selection", slots, []);
    	let { getSelectionLabel = undefined } = $$props;
    	let { item = undefined } = $$props;
    	const writable_props = ["getSelectionLabel", "item"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Selection> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("getSelectionLabel" in $$props) $$invalidate(0, getSelectionLabel = $$props.getSelectionLabel);
    		if ("item" in $$props) $$invalidate(1, item = $$props.item);
    	};

    	$$self.$capture_state = () => ({ getSelectionLabel, item });

    	$$self.$inject_state = $$props => {
    		if ("getSelectionLabel" in $$props) $$invalidate(0, getSelectionLabel = $$props.getSelectionLabel);
    		if ("item" in $$props) $$invalidate(1, item = $$props.item);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [getSelectionLabel, item];
    }

    class Selection extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { getSelectionLabel: 0, item: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Selection",
    			options,
    			id: create_fragment$2.name
    		});
    	}

    	get getSelectionLabel() {
    		throw new Error("<Selection>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set getSelectionLabel(value) {
    		throw new Error("<Selection>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get item() {
    		throw new Error("<Selection>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set item(value) {
    		throw new Error("<Selection>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules/svelte-select/src/MultiSelection.svelte generated by Svelte v3.31.0 */
    const file$3 = "node_modules/svelte-select/src/MultiSelection.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[9] = list[i];
    	child_ctx[11] = i;
    	return child_ctx;
    }

    // (87:8) {#if !isDisabled && !multiFullItemClearable}
    function create_if_block$1(ctx) {
    	let div;
    	let svg;
    	let path;
    	let mounted;
    	let dispose;

    	function click_handler(...args) {
    		return /*click_handler*/ ctx[6](/*i*/ ctx[11], ...args);
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			svg = svg_element("svg");
    			path = svg_element("path");
    			attr_dev(path, "d", "M34.923,37.251L24,26.328L13.077,37.251L9.436,33.61l10.923-10.923L9.436,11.765l3.641-3.641L24,19.047L34.923,8.124 l3.641,3.641L27.641,22.688L38.564,33.61L34.923,37.251z");
    			add_location(path, file$3, 97, 20, 3027);
    			attr_dev(svg, "width", "100%");
    			attr_dev(svg, "height", "100%");
    			attr_dev(svg, "viewBox", "-2 -2 50 50");
    			attr_dev(svg, "focusable", "false");
    			attr_dev(svg, "aria-hidden", "true");
    			attr_dev(svg, "role", "presentation");
    			attr_dev(svg, "class", "svelte-liu9pa");
    			add_location(svg, file$3, 90, 16, 2775);
    			attr_dev(div, "class", "multiSelectItem_clear svelte-liu9pa");
    			add_location(div, file$3, 87, 12, 2647);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, svg);
    			append_dev(svg, path);

    			if (!mounted) {
    				dispose = listen_dev(div, "click", click_handler, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(87:8) {#if !isDisabled && !multiFullItemClearable}",
    		ctx
    	});

    	return block;
    }

    // (77:0) {#each value as item, i}
    function create_each_block$1(ctx) {
    	let div1;
    	let div0;
    	let raw_value = /*getSelectionLabel*/ ctx[4](/*item*/ ctx[9]) + "";
    	let t0;
    	let t1;
    	let div1_class_value;
    	let mounted;
    	let dispose;
    	let if_block = !/*isDisabled*/ ctx[2] && !/*multiFullItemClearable*/ ctx[3] && create_if_block$1(ctx);

    	function click_handler_1(...args) {
    		return /*click_handler_1*/ ctx[7](/*i*/ ctx[11], ...args);
    	}

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			t0 = space();
    			if (if_block) if_block.c();
    			t1 = space();
    			attr_dev(div0, "class", "multiSelectItem_label svelte-liu9pa");
    			add_location(div0, file$3, 83, 8, 2487);
    			attr_dev(div1, "class", div1_class_value = "multiSelectItem " + (/*activeValue*/ ctx[1] === /*i*/ ctx[11] ? "active" : "") + " " + (/*isDisabled*/ ctx[2] ? "disabled" : "") + " svelte-liu9pa");
    			add_location(div1, file$3, 77, 4, 2256);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			div0.innerHTML = raw_value;
    			append_dev(div1, t0);
    			if (if_block) if_block.m(div1, null);
    			append_dev(div1, t1);

    			if (!mounted) {
    				dispose = listen_dev(div1, "click", click_handler_1, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty & /*getSelectionLabel, value*/ 17 && raw_value !== (raw_value = /*getSelectionLabel*/ ctx[4](/*item*/ ctx[9]) + "")) div0.innerHTML = raw_value;
    			if (!/*isDisabled*/ ctx[2] && !/*multiFullItemClearable*/ ctx[3]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$1(ctx);
    					if_block.c();
    					if_block.m(div1, t1);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty & /*activeValue, isDisabled*/ 6 && div1_class_value !== (div1_class_value = "multiSelectItem " + (/*activeValue*/ ctx[1] === /*i*/ ctx[11] ? "active" : "") + " " + (/*isDisabled*/ ctx[2] ? "disabled" : "") + " svelte-liu9pa")) {
    				attr_dev(div1, "class", div1_class_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			if (if_block) if_block.d();
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(77:0) {#each value as item, i}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let each_1_anchor;
    	let each_value = /*value*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*activeValue, isDisabled, multiFullItemClearable, handleClear, getSelectionLabel, value*/ 63) {
    				each_value = /*value*/ ctx[0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("MultiSelection", slots, []);
    	const dispatch = createEventDispatcher();
    	let { value = [] } = $$props;
    	let { activeValue = undefined } = $$props;
    	let { isDisabled = false } = $$props;
    	let { multiFullItemClearable = false } = $$props;
    	let { getSelectionLabel = undefined } = $$props;

    	function handleClear(i, event) {
    		event.stopPropagation();
    		dispatch("multiItemClear", { i });
    	}

    	const writable_props = [
    		"value",
    		"activeValue",
    		"isDisabled",
    		"multiFullItemClearable",
    		"getSelectionLabel"
    	];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<MultiSelection> was created with unknown prop '${key}'`);
    	});

    	const click_handler = (i, event) => handleClear(i, event);
    	const click_handler_1 = (i, event) => multiFullItemClearable ? handleClear(i, event) : {};

    	$$self.$$set = $$props => {
    		if ("value" in $$props) $$invalidate(0, value = $$props.value);
    		if ("activeValue" in $$props) $$invalidate(1, activeValue = $$props.activeValue);
    		if ("isDisabled" in $$props) $$invalidate(2, isDisabled = $$props.isDisabled);
    		if ("multiFullItemClearable" in $$props) $$invalidate(3, multiFullItemClearable = $$props.multiFullItemClearable);
    		if ("getSelectionLabel" in $$props) $$invalidate(4, getSelectionLabel = $$props.getSelectionLabel);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		dispatch,
    		value,
    		activeValue,
    		isDisabled,
    		multiFullItemClearable,
    		getSelectionLabel,
    		handleClear
    	});

    	$$self.$inject_state = $$props => {
    		if ("value" in $$props) $$invalidate(0, value = $$props.value);
    		if ("activeValue" in $$props) $$invalidate(1, activeValue = $$props.activeValue);
    		if ("isDisabled" in $$props) $$invalidate(2, isDisabled = $$props.isDisabled);
    		if ("multiFullItemClearable" in $$props) $$invalidate(3, multiFullItemClearable = $$props.multiFullItemClearable);
    		if ("getSelectionLabel" in $$props) $$invalidate(4, getSelectionLabel = $$props.getSelectionLabel);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		value,
    		activeValue,
    		isDisabled,
    		multiFullItemClearable,
    		getSelectionLabel,
    		handleClear,
    		click_handler,
    		click_handler_1
    	];
    }

    class MultiSelection extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {
    			value: 0,
    			activeValue: 1,
    			isDisabled: 2,
    			multiFullItemClearable: 3,
    			getSelectionLabel: 4
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "MultiSelection",
    			options,
    			id: create_fragment$3.name
    		});
    	}

    	get value() {
    		throw new Error("<MultiSelection>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set value(value) {
    		throw new Error("<MultiSelection>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get activeValue() {
    		throw new Error("<MultiSelection>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set activeValue(value) {
    		throw new Error("<MultiSelection>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get isDisabled() {
    		throw new Error("<MultiSelection>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set isDisabled(value) {
    		throw new Error("<MultiSelection>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get multiFullItemClearable() {
    		throw new Error("<MultiSelection>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set multiFullItemClearable(value) {
    		throw new Error("<MultiSelection>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get getSelectionLabel() {
    		throw new Error("<MultiSelection>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set getSelectionLabel(value) {
    		throw new Error("<MultiSelection>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules/svelte-select/src/VirtualList.svelte generated by Svelte v3.31.0 */
    const file$4 = "node_modules/svelte-select/src/VirtualList.svelte";

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[23] = list[i];
    	return child_ctx;
    }

    const get_default_slot_changes = dirty => ({
    	item: dirty & /*visible*/ 32,
    	i: dirty & /*visible*/ 32,
    	hoverItemIndex: dirty & /*hoverItemIndex*/ 2
    });

    const get_default_slot_context = ctx => ({
    	item: /*row*/ ctx[23].data,
    	i: /*row*/ ctx[23].index,
    	hoverItemIndex: /*hoverItemIndex*/ ctx[1]
    });

    // (154:69) Missing template
    function fallback_block(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Missing template");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: fallback_block.name,
    		type: "fallback",
    		source: "(154:69) Missing template",
    		ctx
    	});

    	return block;
    }

    // (152:8) {#each visible as row (row.index)}
    function create_each_block$2(key_1, ctx) {
    	let svelte_virtual_list_row;
    	let t;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[15].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[14], get_default_slot_context);
    	const default_slot_or_fallback = default_slot || fallback_block(ctx);

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			svelte_virtual_list_row = element("svelte-virtual-list-row");
    			if (default_slot_or_fallback) default_slot_or_fallback.c();
    			t = space();
    			set_custom_element_data(svelte_virtual_list_row, "class", "svelte-g2cagw");
    			add_location(svelte_virtual_list_row, file$4, 152, 12, 3778);
    			this.first = svelte_virtual_list_row;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svelte_virtual_list_row, anchor);

    			if (default_slot_or_fallback) {
    				default_slot_or_fallback.m(svelte_virtual_list_row, null);
    			}

    			append_dev(svelte_virtual_list_row, t);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope, visible, hoverItemIndex*/ 16418) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[14], dirty, get_default_slot_changes, get_default_slot_context);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot_or_fallback, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot_or_fallback, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svelte_virtual_list_row);
    			if (default_slot_or_fallback) default_slot_or_fallback.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$2.name,
    		type: "each",
    		source: "(152:8) {#each visible as row (row.index)}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$4(ctx) {
    	let svelte_virtual_list_viewport;
    	let svelte_virtual_list_contents;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let svelte_virtual_list_viewport_resize_listener;
    	let current;
    	let mounted;
    	let dispose;
    	let each_value = /*visible*/ ctx[5];
    	validate_each_argument(each_value);
    	const get_key = ctx => /*row*/ ctx[23].index;
    	validate_each_keys(ctx, each_value, get_each_context$2, get_key);

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context$2(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block$2(key, child_ctx));
    	}

    	const block = {
    		c: function create() {
    			svelte_virtual_list_viewport = element("svelte-virtual-list-viewport");
    			svelte_virtual_list_contents = element("svelte-virtual-list-contents");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			set_style(svelte_virtual_list_contents, "padding-top", /*top*/ ctx[6] + "px");
    			set_style(svelte_virtual_list_contents, "padding-bottom", /*bottom*/ ctx[7] + "px");
    			set_custom_element_data(svelte_virtual_list_contents, "class", "svelte-g2cagw");
    			add_location(svelte_virtual_list_contents, file$4, 148, 4, 3597);
    			set_style(svelte_virtual_list_viewport, "height", /*height*/ ctx[0]);
    			set_custom_element_data(svelte_virtual_list_viewport, "class", "svelte-g2cagw");
    			add_render_callback(() => /*svelte_virtual_list_viewport_elementresize_handler*/ ctx[18].call(svelte_virtual_list_viewport));
    			add_location(svelte_virtual_list_viewport, file$4, 143, 0, 3437);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svelte_virtual_list_viewport, anchor);
    			append_dev(svelte_virtual_list_viewport, svelte_virtual_list_contents);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(svelte_virtual_list_contents, null);
    			}

    			/*svelte_virtual_list_contents_binding*/ ctx[16](svelte_virtual_list_contents);
    			/*svelte_virtual_list_viewport_binding*/ ctx[17](svelte_virtual_list_viewport);
    			svelte_virtual_list_viewport_resize_listener = add_resize_listener(svelte_virtual_list_viewport, /*svelte_virtual_list_viewport_elementresize_handler*/ ctx[18].bind(svelte_virtual_list_viewport));
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(svelte_virtual_list_viewport, "scroll", /*handle_scroll*/ ctx[8], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*$$scope, visible, hoverItemIndex*/ 16418) {
    				const each_value = /*visible*/ ctx[5];
    				validate_each_argument(each_value);
    				group_outros();
    				validate_each_keys(ctx, each_value, get_each_context$2, get_key);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, svelte_virtual_list_contents, outro_and_destroy_block, create_each_block$2, null, get_each_context$2);
    				check_outros();
    			}

    			if (!current || dirty & /*top*/ 64) {
    				set_style(svelte_virtual_list_contents, "padding-top", /*top*/ ctx[6] + "px");
    			}

    			if (!current || dirty & /*bottom*/ 128) {
    				set_style(svelte_virtual_list_contents, "padding-bottom", /*bottom*/ ctx[7] + "px");
    			}

    			if (!current || dirty & /*height*/ 1) {
    				set_style(svelte_virtual_list_viewport, "height", /*height*/ ctx[0]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svelte_virtual_list_viewport);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}

    			/*svelte_virtual_list_contents_binding*/ ctx[16](null);
    			/*svelte_virtual_list_viewport_binding*/ ctx[17](null);
    			svelte_virtual_list_viewport_resize_listener();
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("VirtualList", slots, ['default']);
    	let { items = undefined } = $$props;
    	let { height = "100%" } = $$props;
    	let { itemHeight = 40 } = $$props;
    	let { hoverItemIndex = 0 } = $$props;
    	let { start = 0 } = $$props;
    	let { end = 0 } = $$props;
    	let height_map = [];
    	let rows;
    	let viewport;
    	let contents;
    	let viewport_height = 0;
    	let visible;
    	let mounted;
    	let top = 0;
    	let bottom = 0;
    	let average_height;

    	async function refresh(items, viewport_height, itemHeight) {
    		const { scrollTop } = viewport;
    		await tick();
    		let content_height = top - scrollTop;
    		let i = start;

    		while (content_height < viewport_height && i < items.length) {
    			let row = rows[i - start];

    			if (!row) {
    				$$invalidate(10, end = i + 1);
    				await tick();
    				row = rows[i - start];
    			}

    			const row_height = height_map[i] = itemHeight || row.offsetHeight;
    			content_height += row_height;
    			i += 1;
    		}

    		$$invalidate(10, end = i);
    		const remaining = items.length - end;
    		average_height = (top + content_height) / end;
    		$$invalidate(7, bottom = remaining * average_height);
    		height_map.length = items.length;
    		if (viewport) $$invalidate(3, viewport.scrollTop = 0, viewport);
    	}

    	async function handle_scroll() {
    		const { scrollTop } = viewport;
    		const old_start = start;

    		for (let v = 0; v < rows.length; v += 1) {
    			height_map[start + v] = itemHeight || rows[v].offsetHeight;
    		}

    		let i = 0;
    		let y = 0;

    		while (i < items.length) {
    			const row_height = height_map[i] || average_height;

    			if (y + row_height > scrollTop) {
    				$$invalidate(9, start = i);
    				$$invalidate(6, top = y);
    				break;
    			}

    			y += row_height;
    			i += 1;
    		}

    		while (i < items.length) {
    			y += height_map[i] || average_height;
    			i += 1;
    			if (y > scrollTop + viewport_height) break;
    		}

    		$$invalidate(10, end = i);
    		const remaining = items.length - end;
    		average_height = y / end;
    		while (i < items.length) height_map[i++] = average_height;
    		$$invalidate(7, bottom = remaining * average_height);

    		if (start < old_start) {
    			await tick();
    			let expected_height = 0;
    			let actual_height = 0;

    			for (let i = start; i < old_start; i += 1) {
    				if (rows[i - start]) {
    					expected_height += height_map[i];
    					actual_height += itemHeight || rows[i - start].offsetHeight;
    				}
    			}

    			const d = actual_height - expected_height;
    			viewport.scrollTo(0, scrollTop + d);
    		}
    	}

    	onMount(() => {
    		rows = contents.getElementsByTagName("svelte-virtual-list-row");
    		$$invalidate(13, mounted = true);
    	});

    	const writable_props = ["items", "height", "itemHeight", "hoverItemIndex", "start", "end"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<VirtualList> was created with unknown prop '${key}'`);
    	});

    	function svelte_virtual_list_contents_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			contents = $$value;
    			$$invalidate(4, contents);
    		});
    	}

    	function svelte_virtual_list_viewport_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			viewport = $$value;
    			$$invalidate(3, viewport);
    		});
    	}

    	function svelte_virtual_list_viewport_elementresize_handler() {
    		viewport_height = this.offsetHeight;
    		$$invalidate(2, viewport_height);
    	}

    	$$self.$$set = $$props => {
    		if ("items" in $$props) $$invalidate(11, items = $$props.items);
    		if ("height" in $$props) $$invalidate(0, height = $$props.height);
    		if ("itemHeight" in $$props) $$invalidate(12, itemHeight = $$props.itemHeight);
    		if ("hoverItemIndex" in $$props) $$invalidate(1, hoverItemIndex = $$props.hoverItemIndex);
    		if ("start" in $$props) $$invalidate(9, start = $$props.start);
    		if ("end" in $$props) $$invalidate(10, end = $$props.end);
    		if ("$$scope" in $$props) $$invalidate(14, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		onMount,
    		tick,
    		items,
    		height,
    		itemHeight,
    		hoverItemIndex,
    		start,
    		end,
    		height_map,
    		rows,
    		viewport,
    		contents,
    		viewport_height,
    		visible,
    		mounted,
    		top,
    		bottom,
    		average_height,
    		refresh,
    		handle_scroll
    	});

    	$$self.$inject_state = $$props => {
    		if ("items" in $$props) $$invalidate(11, items = $$props.items);
    		if ("height" in $$props) $$invalidate(0, height = $$props.height);
    		if ("itemHeight" in $$props) $$invalidate(12, itemHeight = $$props.itemHeight);
    		if ("hoverItemIndex" in $$props) $$invalidate(1, hoverItemIndex = $$props.hoverItemIndex);
    		if ("start" in $$props) $$invalidate(9, start = $$props.start);
    		if ("end" in $$props) $$invalidate(10, end = $$props.end);
    		if ("height_map" in $$props) height_map = $$props.height_map;
    		if ("rows" in $$props) rows = $$props.rows;
    		if ("viewport" in $$props) $$invalidate(3, viewport = $$props.viewport);
    		if ("contents" in $$props) $$invalidate(4, contents = $$props.contents);
    		if ("viewport_height" in $$props) $$invalidate(2, viewport_height = $$props.viewport_height);
    		if ("visible" in $$props) $$invalidate(5, visible = $$props.visible);
    		if ("mounted" in $$props) $$invalidate(13, mounted = $$props.mounted);
    		if ("top" in $$props) $$invalidate(6, top = $$props.top);
    		if ("bottom" in $$props) $$invalidate(7, bottom = $$props.bottom);
    		if ("average_height" in $$props) average_height = $$props.average_height;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*items, start, end*/ 3584) {
    			 $$invalidate(5, visible = items.slice(start, end).map((data, i) => {
    				return { index: i + start, data };
    			}));
    		}

    		if ($$self.$$.dirty & /*mounted, items, viewport_height, itemHeight*/ 14340) {
    			 if (mounted) refresh(items, viewport_height, itemHeight);
    		}
    	};

    	return [
    		height,
    		hoverItemIndex,
    		viewport_height,
    		viewport,
    		contents,
    		visible,
    		top,
    		bottom,
    		handle_scroll,
    		start,
    		end,
    		items,
    		itemHeight,
    		mounted,
    		$$scope,
    		slots,
    		svelte_virtual_list_contents_binding,
    		svelte_virtual_list_viewport_binding,
    		svelte_virtual_list_viewport_elementresize_handler
    	];
    }

    class VirtualList extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {
    			items: 11,
    			height: 0,
    			itemHeight: 12,
    			hoverItemIndex: 1,
    			start: 9,
    			end: 10
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "VirtualList",
    			options,
    			id: create_fragment$4.name
    		});
    	}

    	get items() {
    		throw new Error("<VirtualList>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set items(value) {
    		throw new Error("<VirtualList>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get height() {
    		throw new Error("<VirtualList>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set height(value) {
    		throw new Error("<VirtualList>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get itemHeight() {
    		throw new Error("<VirtualList>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set itemHeight(value) {
    		throw new Error("<VirtualList>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get hoverItemIndex() {
    		throw new Error("<VirtualList>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set hoverItemIndex(value) {
    		throw new Error("<VirtualList>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get start() {
    		throw new Error("<VirtualList>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set start(value) {
    		throw new Error("<VirtualList>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get end() {
    		throw new Error("<VirtualList>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set end(value) {
    		throw new Error("<VirtualList>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules/svelte-select/src/ClearIcon.svelte generated by Svelte v3.31.0 */

    const file$5 = "node_modules/svelte-select/src/ClearIcon.svelte";

    function create_fragment$5(ctx) {
    	let svg;
    	let path;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			path = svg_element("path");
    			attr_dev(path, "fill", "currentColor");
    			attr_dev(path, "d", "M34.923,37.251L24,26.328L13.077,37.251L9.436,33.61l10.923-10.923L9.436,11.765l3.641-3.641L24,19.047L34.923,8.124\n    l3.641,3.641L27.641,22.688L38.564,33.61L34.923,37.251z");
    			add_location(path, file$5, 8, 4, 141);
    			attr_dev(svg, "width", "100%");
    			attr_dev(svg, "height", "100%");
    			attr_dev(svg, "viewBox", "-2 -2 50 50");
    			attr_dev(svg, "focusable", "false");
    			attr_dev(svg, "aria-hidden", "true");
    			attr_dev(svg, "role", "presentation");
    			add_location(svg, file$5, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, path);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("ClearIcon", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<ClearIcon> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class ClearIcon extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ClearIcon",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    function debounce(func, wait, immediate) {
        let timeout;

        return function executedFunction() {
            let context = this;
            let args = arguments;

            let later = function () {
                timeout = null;
                if (!immediate) func.apply(context, args);
            };

            let callNow = immediate && !timeout;

            clearTimeout(timeout);

            timeout = setTimeout(later, wait);

            if (callNow) func.apply(context, args);
        };
    }

    /* node_modules/svelte-select/src/Select.svelte generated by Svelte v3.31.0 */

    const { Object: Object_1, console: console_1 } = globals;
    const file$6 = "node_modules/svelte-select/src/Select.svelte";

    function get_each_context$3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[103] = list[i];
    	return child_ctx;
    }

    // (874:8) {#if isFocused}
    function create_if_block_10(ctx) {
    	let span0;
    	let t0;
    	let t1;
    	let span1;
    	let t2;

    	const block = {
    		c: function create() {
    			span0 = element("span");
    			t0 = text(/*ariaSelection*/ ctx[36]);
    			t1 = space();
    			span1 = element("span");
    			t2 = text(/*ariaContext*/ ctx[37]);
    			attr_dev(span0, "id", "aria-selection");
    			add_location(span0, file$6, 874, 12, 23719);
    			attr_dev(span1, "id", "aria-context");
    			add_location(span1, file$6, 875, 12, 23780);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span0, anchor);
    			append_dev(span0, t0);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, span1, anchor);
    			append_dev(span1, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[1] & /*ariaSelection*/ 32) set_data_dev(t0, /*ariaSelection*/ ctx[36]);
    			if (dirty[1] & /*ariaContext*/ 64) set_data_dev(t2, /*ariaContext*/ ctx[37]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(span1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_10.name,
    		type: "if",
    		source: "(874:8) {#if isFocused}",
    		ctx
    	});

    	return block;
    }

    // (882:4) {#if Icon}
    function create_if_block_9(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;
    	const switch_instance_spread_levels = [/*iconProps*/ ctx[18]];
    	var switch_value = /*Icon*/ ctx[17];

    	function switch_props(ctx) {
    		let switch_instance_props = {};

    		for (let i = 0; i < switch_instance_spread_levels.length; i += 1) {
    			switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
    		}

    		return {
    			props: switch_instance_props,
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props());
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert_dev(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const switch_instance_changes = (dirty[0] & /*iconProps*/ 262144)
    			? get_spread_update(switch_instance_spread_levels, [get_spread_object(/*iconProps*/ ctx[18])])
    			: {};

    			if (switch_value !== (switch_value = /*Icon*/ ctx[17])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props());
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_9.name,
    		type: "if",
    		source: "(882:4) {#if Icon}",
    		ctx
    	});

    	return block;
    }

    // (886:4) {#if showMultiSelect}
    function create_if_block_8(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;
    	var switch_value = /*MultiSelection*/ ctx[26];

    	function switch_props(ctx) {
    		return {
    			props: {
    				value: /*value*/ ctx[2],
    				getSelectionLabel: /*getSelectionLabel*/ ctx[12],
    				activeValue: /*activeValue*/ ctx[30],
    				isDisabled: /*isDisabled*/ ctx[9],
    				multiFullItemClearable: /*multiFullItemClearable*/ ctx[8]
    			},
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props(ctx));
    		switch_instance.$on("multiItemClear", /*handleMultiItemClear*/ ctx[38]);
    		switch_instance.$on("focus", /*handleFocus*/ ctx[40]);
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert_dev(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const switch_instance_changes = {};
    			if (dirty[0] & /*value*/ 4) switch_instance_changes.value = /*value*/ ctx[2];
    			if (dirty[0] & /*getSelectionLabel*/ 4096) switch_instance_changes.getSelectionLabel = /*getSelectionLabel*/ ctx[12];
    			if (dirty[0] & /*activeValue*/ 1073741824) switch_instance_changes.activeValue = /*activeValue*/ ctx[30];
    			if (dirty[0] & /*isDisabled*/ 512) switch_instance_changes.isDisabled = /*isDisabled*/ ctx[9];
    			if (dirty[0] & /*multiFullItemClearable*/ 256) switch_instance_changes.multiFullItemClearable = /*multiFullItemClearable*/ ctx[8];

    			if (switch_value !== (switch_value = /*MultiSelection*/ ctx[26])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props(ctx));
    					switch_instance.$on("multiItemClear", /*handleMultiItemClear*/ ctx[38]);
    					switch_instance.$on("focus", /*handleFocus*/ ctx[40]);
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_8.name,
    		type: "if",
    		source: "(886:4) {#if showMultiSelect}",
    		ctx
    	});

    	return block;
    }

    // (908:4) {#if !isMulti && showSelectedItem}
    function create_if_block_7(ctx) {
    	let div;
    	let switch_instance;
    	let current;
    	let mounted;
    	let dispose;
    	var switch_value = /*Selection*/ ctx[25];

    	function switch_props(ctx) {
    		return {
    			props: {
    				item: /*value*/ ctx[2],
    				getSelectionLabel: /*getSelectionLabel*/ ctx[12]
    			},
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props(ctx));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			attr_dev(div, "class", "selectedItem svelte-b8sh3g");
    			add_location(div, file$6, 908, 8, 24602);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			if (switch_instance) {
    				mount_component(switch_instance, div, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(div, "focus", /*handleFocus*/ ctx[40], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			const switch_instance_changes = {};
    			if (dirty[0] & /*value*/ 4) switch_instance_changes.item = /*value*/ ctx[2];
    			if (dirty[0] & /*getSelectionLabel*/ 4096) switch_instance_changes.getSelectionLabel = /*getSelectionLabel*/ ctx[12];

    			if (switch_value !== (switch_value = /*Selection*/ ctx[25])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props(ctx));
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, div, null);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (switch_instance) destroy_component(switch_instance);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_7.name,
    		type: "if",
    		source: "(908:4) {#if !isMulti && showSelectedItem}",
    		ctx
    	});

    	return block;
    }

    // (917:4) {#if showClearIcon}
    function create_if_block_6(ctx) {
    	let div;
    	let switch_instance;
    	let current;
    	let mounted;
    	let dispose;
    	var switch_value = /*ClearIcon*/ ctx[23];

    	function switch_props(ctx) {
    		return { $$inline: true };
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props());
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			attr_dev(div, "class", "clearSelect svelte-b8sh3g");
    			attr_dev(div, "aria-hidden", "true");
    			add_location(div, file$6, 917, 8, 24841);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			if (switch_instance) {
    				mount_component(switch_instance, div, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(div, "click", prevent_default(/*handleClear*/ ctx[27]), false, true, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (switch_value !== (switch_value = /*ClearIcon*/ ctx[23])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props());
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, div, null);
    				} else {
    					switch_instance = null;
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (switch_instance) destroy_component(switch_instance);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_6.name,
    		type: "if",
    		source: "(917:4) {#if showClearIcon}",
    		ctx
    	});

    	return block;
    }

    // (926:4) {#if !showClearIcon && (showIndicator || (showChevron && !value) || (!isSearchable && !isDisabled && !isWaiting && ((showSelectedItem && !isClearable) || !showSelectedItem)))}
    function create_if_block_4(ctx) {
    	let div;

    	function select_block_type(ctx, dirty) {
    		if (/*indicatorSvg*/ ctx[22]) return create_if_block_5;
    		return create_else_block$1;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if_block.c();
    			attr_dev(div, "class", "indicator svelte-b8sh3g");
    			attr_dev(div, "aria-hidden", "true");
    			add_location(div, file$6, 926, 8, 25224);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			if_block.m(div, null);
    		},
    		p: function update(ctx, dirty) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(div, null);
    				}
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(926:4) {#if !showClearIcon && (showIndicator || (showChevron && !value) || (!isSearchable && !isDisabled && !isWaiting && ((showSelectedItem && !isClearable) || !showSelectedItem)))}",
    		ctx
    	});

    	return block;
    }

    // (930:12) {:else}
    function create_else_block$1(ctx) {
    	let svg;
    	let path;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			path = svg_element("path");
    			attr_dev(path, "d", "M4.516 7.548c0.436-0.446 1.043-0.481 1.576 0l3.908 3.747\n          3.908-3.747c0.533-0.481 1.141-0.446 1.574 0 0.436 0.445 0.408 1.197 0\n          1.615-0.406 0.418-4.695 4.502-4.695 4.502-0.217 0.223-0.502\n          0.335-0.787 0.335s-0.57-0.112-0.789-0.335c0\n          0-4.287-4.084-4.695-4.502s-0.436-1.17 0-1.615z");
    			add_location(path, file$6, 936, 20, 25581);
    			attr_dev(svg, "width", "100%");
    			attr_dev(svg, "height", "100%");
    			attr_dev(svg, "viewBox", "0 0 20 20");
    			attr_dev(svg, "focusable", "false");
    			attr_dev(svg, "aria-hidden", "true");
    			attr_dev(svg, "class", "svelte-b8sh3g");
    			add_location(svg, file$6, 930, 16, 25371);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, path);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$1.name,
    		type: "else",
    		source: "(930:12) {:else}",
    		ctx
    	});

    	return block;
    }

    // (928:12) {#if indicatorSvg}
    function create_if_block_5(ctx) {
    	let html_tag;
    	let html_anchor;

    	const block = {
    		c: function create() {
    			html_anchor = empty();
    			html_tag = new HtmlTag(html_anchor);
    		},
    		m: function mount(target, anchor) {
    			html_tag.m(/*indicatorSvg*/ ctx[22], target, anchor);
    			insert_dev(target, html_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*indicatorSvg*/ 4194304) html_tag.p(/*indicatorSvg*/ ctx[22]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(html_anchor);
    			if (detaching) html_tag.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_5.name,
    		type: "if",
    		source: "(928:12) {#if indicatorSvg}",
    		ctx
    	});

    	return block;
    }

    // (948:4) {#if isWaiting}
    function create_if_block_3(ctx) {
    	let div;
    	let svg;
    	let circle;

    	const block = {
    		c: function create() {
    			div = element("div");
    			svg = svg_element("svg");
    			circle = svg_element("circle");
    			attr_dev(circle, "class", "spinner_path svelte-b8sh3g");
    			attr_dev(circle, "cx", "50");
    			attr_dev(circle, "cy", "50");
    			attr_dev(circle, "r", "20");
    			attr_dev(circle, "fill", "none");
    			attr_dev(circle, "stroke", "currentColor");
    			attr_dev(circle, "stroke-width", "5");
    			attr_dev(circle, "stroke-miterlimit", "10");
    			add_location(circle, file$6, 950, 16, 26130);
    			attr_dev(svg, "class", "spinner_icon svelte-b8sh3g");
    			attr_dev(svg, "viewBox", "25 25 50 50");
    			add_location(svg, file$6, 949, 12, 26065);
    			attr_dev(div, "class", "spinner svelte-b8sh3g");
    			add_location(div, file$6, 948, 8, 26031);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, svg);
    			append_dev(svg, circle);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(948:4) {#if isWaiting}",
    		ctx
    	});

    	return block;
    }

    // (964:4) {#if listOpen}
    function create_if_block_2$1(ctx) {
    	let switch_instance;
    	let updating_hoverItemIndex;
    	let switch_instance_anchor;
    	let current;
    	const switch_instance_spread_levels = [/*listProps*/ ctx[35]];

    	function switch_instance_hoverItemIndex_binding(value) {
    		/*switch_instance_hoverItemIndex_binding*/ ctx[84].call(null, value);
    	}

    	var switch_value = /*List*/ ctx[24];

    	function switch_props(ctx) {
    		let switch_instance_props = {};

    		for (let i = 0; i < switch_instance_spread_levels.length; i += 1) {
    			switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
    		}

    		if (/*hoverItemIndex*/ ctx[28] !== void 0) {
    			switch_instance_props.hoverItemIndex = /*hoverItemIndex*/ ctx[28];
    		}

    		return {
    			props: switch_instance_props,
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props(ctx));
    		binding_callbacks.push(() => bind(switch_instance, "hoverItemIndex", switch_instance_hoverItemIndex_binding));
    		switch_instance.$on("itemSelected", /*itemSelected*/ ctx[43]);
    		switch_instance.$on("itemCreated", /*itemCreated*/ ctx[44]);
    		switch_instance.$on("closeList", /*closeList*/ ctx[45]);
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert_dev(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const switch_instance_changes = (dirty[1] & /*listProps*/ 16)
    			? get_spread_update(switch_instance_spread_levels, [get_spread_object(/*listProps*/ ctx[35])])
    			: {};

    			if (!updating_hoverItemIndex && dirty[0] & /*hoverItemIndex*/ 268435456) {
    				updating_hoverItemIndex = true;
    				switch_instance_changes.hoverItemIndex = /*hoverItemIndex*/ ctx[28];
    				add_flush_callback(() => updating_hoverItemIndex = false);
    			}

    			if (switch_value !== (switch_value = /*List*/ ctx[24])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props(ctx));
    					binding_callbacks.push(() => bind(switch_instance, "hoverItemIndex", switch_instance_hoverItemIndex_binding));
    					switch_instance.$on("itemSelected", /*itemSelected*/ ctx[43]);
    					switch_instance.$on("itemCreated", /*itemCreated*/ ctx[44]);
    					switch_instance.$on("closeList", /*closeList*/ ctx[45]);
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$1.name,
    		type: "if",
    		source: "(964:4) {#if listOpen}",
    		ctx
    	});

    	return block;
    }

    // (974:4) {#if !isMulti || (isMulti && !showMultiSelect)}
    function create_if_block_1$1(ctx) {
    	let input_1;
    	let input_1_name_value;
    	let input_1_value_value;

    	const block = {
    		c: function create() {
    			input_1 = element("input");
    			attr_dev(input_1, "name", input_1_name_value = /*inputAttributes*/ ctx[16].name);
    			attr_dev(input_1, "type", "hidden");

    			input_1.value = input_1_value_value = /*value*/ ctx[2]
    			? /*getSelectionLabel*/ ctx[12](/*value*/ ctx[2])
    			: null;

    			attr_dev(input_1, "class", "svelte-b8sh3g");
    			add_location(input_1, file$6, 974, 8, 26787);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, input_1, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*inputAttributes*/ 65536 && input_1_name_value !== (input_1_name_value = /*inputAttributes*/ ctx[16].name)) {
    				attr_dev(input_1, "name", input_1_name_value);
    			}

    			if (dirty[0] & /*value, getSelectionLabel*/ 4100 && input_1_value_value !== (input_1_value_value = /*value*/ ctx[2]
    			? /*getSelectionLabel*/ ctx[12](/*value*/ ctx[2])
    			: null)) {
    				prop_dev(input_1, "value", input_1_value_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(input_1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(974:4) {#if !isMulti || (isMulti && !showMultiSelect)}",
    		ctx
    	});

    	return block;
    }

    // (981:4) {#if isMulti && showMultiSelect}
    function create_if_block$2(ctx) {
    	let each_1_anchor;
    	let each_value = /*value*/ ctx[2];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$3(get_each_context$3(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*inputAttributes, value, getSelectionLabel*/ 69636) {
    				each_value = /*value*/ ctx[2];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$3(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$3(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(981:4) {#if isMulti && showMultiSelect}",
    		ctx
    	});

    	return block;
    }

    // (982:8) {#each value as item}
    function create_each_block$3(ctx) {
    	let input_1;
    	let input_1_name_value;
    	let input_1_value_value;

    	const block = {
    		c: function create() {
    			input_1 = element("input");
    			attr_dev(input_1, "name", input_1_name_value = /*inputAttributes*/ ctx[16].name);
    			attr_dev(input_1, "type", "hidden");

    			input_1.value = input_1_value_value = /*item*/ ctx[103]
    			? /*getSelectionLabel*/ ctx[12](/*item*/ ctx[103])
    			: null;

    			attr_dev(input_1, "class", "svelte-b8sh3g");
    			add_location(input_1, file$6, 982, 12, 27013);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, input_1, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*inputAttributes*/ 65536 && input_1_name_value !== (input_1_name_value = /*inputAttributes*/ ctx[16].name)) {
    				attr_dev(input_1, "name", input_1_name_value);
    			}

    			if (dirty[0] & /*value, getSelectionLabel*/ 4100 && input_1_value_value !== (input_1_value_value = /*item*/ ctx[103]
    			? /*getSelectionLabel*/ ctx[12](/*item*/ ctx[103])
    			: null)) {
    				prop_dev(input_1, "value", input_1_value_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(input_1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$3.name,
    		type: "each",
    		source: "(982:8) {#each value as item}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$6(ctx) {
    	let div;
    	let span;
    	let t0;
    	let t1;
    	let t2;
    	let input_1;
    	let input_1_readonly_value;
    	let t3;
    	let t4;
    	let t5;
    	let t6;
    	let t7;
    	let t8;
    	let t9;
    	let div_class_value;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block0 = /*isFocused*/ ctx[1] && create_if_block_10(ctx);
    	let if_block1 = /*Icon*/ ctx[17] && create_if_block_9(ctx);
    	let if_block2 = /*showMultiSelect*/ ctx[34] && create_if_block_8(ctx);

    	let input_1_levels = [
    		{
    			readOnly: input_1_readonly_value = !/*isSearchable*/ ctx[13]
    		},
    		/*_inputAttributes*/ ctx[31],
    		{ placeholder: /*placeholderText*/ ctx[33] },
    		{ style: /*inputStyles*/ ctx[14] },
    		{ disabled: /*isDisabled*/ ctx[9] }
    	];

    	let input_1_data = {};

    	for (let i = 0; i < input_1_levels.length; i += 1) {
    		input_1_data = assign(input_1_data, input_1_levels[i]);
    	}

    	let if_block3 = !/*isMulti*/ ctx[7] && /*showSelectedItem*/ ctx[29] && create_if_block_7(ctx);
    	let if_block4 = /*showClearIcon*/ ctx[32] && create_if_block_6(ctx);
    	let if_block5 = !/*showClearIcon*/ ctx[32] && (/*showIndicator*/ ctx[20] || /*showChevron*/ ctx[19] && !/*value*/ ctx[2] || !/*isSearchable*/ ctx[13] && !/*isDisabled*/ ctx[9] && !/*isWaiting*/ ctx[4] && (/*showSelectedItem*/ ctx[29] && !/*isClearable*/ ctx[15] || !/*showSelectedItem*/ ctx[29])) && create_if_block_4(ctx);
    	let if_block6 = /*isWaiting*/ ctx[4] && create_if_block_3(ctx);
    	let if_block7 = /*listOpen*/ ctx[5] && create_if_block_2$1(ctx);
    	let if_block8 = (!/*isMulti*/ ctx[7] || /*isMulti*/ ctx[7] && !/*showMultiSelect*/ ctx[34]) && create_if_block_1$1(ctx);
    	let if_block9 = /*isMulti*/ ctx[7] && /*showMultiSelect*/ ctx[34] && create_if_block$2(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			span = element("span");
    			if (if_block0) if_block0.c();
    			t0 = space();
    			if (if_block1) if_block1.c();
    			t1 = space();
    			if (if_block2) if_block2.c();
    			t2 = space();
    			input_1 = element("input");
    			t3 = space();
    			if (if_block3) if_block3.c();
    			t4 = space();
    			if (if_block4) if_block4.c();
    			t5 = space();
    			if (if_block5) if_block5.c();
    			t6 = space();
    			if (if_block6) if_block6.c();
    			t7 = space();
    			if (if_block7) if_block7.c();
    			t8 = space();
    			if (if_block8) if_block8.c();
    			t9 = space();
    			if (if_block9) if_block9.c();
    			attr_dev(span, "aria-live", "polite");
    			attr_dev(span, "aria-atomic", "false");
    			attr_dev(span, "aria-relevant", "additions text");
    			attr_dev(span, "class", "a11yText svelte-b8sh3g");
    			add_location(span, file$6, 868, 4, 23557);
    			set_attributes(input_1, input_1_data);
    			toggle_class(input_1, "svelte-b8sh3g", true);
    			add_location(input_1, file$6, 897, 4, 24296);
    			attr_dev(div, "class", div_class_value = "selectContainer " + /*containerClasses*/ ctx[21] + " svelte-b8sh3g");
    			attr_dev(div, "style", /*containerStyles*/ ctx[11]);
    			toggle_class(div, "hasError", /*hasError*/ ctx[10]);
    			toggle_class(div, "multiSelect", /*isMulti*/ ctx[7]);
    			toggle_class(div, "disabled", /*isDisabled*/ ctx[9]);
    			toggle_class(div, "focused", /*isFocused*/ ctx[1]);
    			add_location(div, file$6, 859, 0, 23306);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, span);
    			if (if_block0) if_block0.m(span, null);
    			append_dev(div, t0);
    			if (if_block1) if_block1.m(div, null);
    			append_dev(div, t1);
    			if (if_block2) if_block2.m(div, null);
    			append_dev(div, t2);
    			append_dev(div, input_1);
    			/*input_1_binding*/ ctx[82](input_1);
    			set_input_value(input_1, /*filterText*/ ctx[3]);
    			append_dev(div, t3);
    			if (if_block3) if_block3.m(div, null);
    			append_dev(div, t4);
    			if (if_block4) if_block4.m(div, null);
    			append_dev(div, t5);
    			if (if_block5) if_block5.m(div, null);
    			append_dev(div, t6);
    			if (if_block6) if_block6.m(div, null);
    			append_dev(div, t7);
    			if (if_block7) if_block7.m(div, null);
    			append_dev(div, t8);
    			if (if_block8) if_block8.m(div, null);
    			append_dev(div, t9);
    			if (if_block9) if_block9.m(div, null);
    			/*div_binding*/ ctx[85](div);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(window, "click", /*handleWindowEvent*/ ctx[41], false, false, false),
    					listen_dev(window, "focusin", /*handleWindowEvent*/ ctx[41], false, false, false),
    					listen_dev(window, "keydown", /*handleKeyDown*/ ctx[39], false, false, false),
    					listen_dev(input_1, "focus", /*handleFocus*/ ctx[40], false, false, false),
    					listen_dev(input_1, "input", /*input_1_input_handler*/ ctx[83]),
    					listen_dev(div, "click", /*handleClick*/ ctx[42], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (/*isFocused*/ ctx[1]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_10(ctx);
    					if_block0.c();
    					if_block0.m(span, null);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*Icon*/ ctx[17]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);

    					if (dirty[0] & /*Icon*/ 131072) {
    						transition_in(if_block1, 1);
    					}
    				} else {
    					if_block1 = create_if_block_9(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(div, t1);
    				}
    			} else if (if_block1) {
    				group_outros();

    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});

    				check_outros();
    			}

    			if (/*showMultiSelect*/ ctx[34]) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);

    					if (dirty[1] & /*showMultiSelect*/ 8) {
    						transition_in(if_block2, 1);
    					}
    				} else {
    					if_block2 = create_if_block_8(ctx);
    					if_block2.c();
    					transition_in(if_block2, 1);
    					if_block2.m(div, t2);
    				}
    			} else if (if_block2) {
    				group_outros();

    				transition_out(if_block2, 1, 1, () => {
    					if_block2 = null;
    				});

    				check_outros();
    			}

    			set_attributes(input_1, input_1_data = get_spread_update(input_1_levels, [
    				(!current || dirty[0] & /*isSearchable*/ 8192 && input_1_readonly_value !== (input_1_readonly_value = !/*isSearchable*/ ctx[13])) && { readOnly: input_1_readonly_value },
    				dirty[1] & /*_inputAttributes*/ 1 && /*_inputAttributes*/ ctx[31],
    				(!current || dirty[1] & /*placeholderText*/ 4) && { placeholder: /*placeholderText*/ ctx[33] },
    				(!current || dirty[0] & /*inputStyles*/ 16384) && { style: /*inputStyles*/ ctx[14] },
    				(!current || dirty[0] & /*isDisabled*/ 512) && { disabled: /*isDisabled*/ ctx[9] }
    			]));

    			if (dirty[0] & /*filterText*/ 8 && input_1.value !== /*filterText*/ ctx[3]) {
    				set_input_value(input_1, /*filterText*/ ctx[3]);
    			}

    			toggle_class(input_1, "svelte-b8sh3g", true);

    			if (!/*isMulti*/ ctx[7] && /*showSelectedItem*/ ctx[29]) {
    				if (if_block3) {
    					if_block3.p(ctx, dirty);

    					if (dirty[0] & /*isMulti, showSelectedItem*/ 536871040) {
    						transition_in(if_block3, 1);
    					}
    				} else {
    					if_block3 = create_if_block_7(ctx);
    					if_block3.c();
    					transition_in(if_block3, 1);
    					if_block3.m(div, t4);
    				}
    			} else if (if_block3) {
    				group_outros();

    				transition_out(if_block3, 1, 1, () => {
    					if_block3 = null;
    				});

    				check_outros();
    			}

    			if (/*showClearIcon*/ ctx[32]) {
    				if (if_block4) {
    					if_block4.p(ctx, dirty);

    					if (dirty[1] & /*showClearIcon*/ 2) {
    						transition_in(if_block4, 1);
    					}
    				} else {
    					if_block4 = create_if_block_6(ctx);
    					if_block4.c();
    					transition_in(if_block4, 1);
    					if_block4.m(div, t5);
    				}
    			} else if (if_block4) {
    				group_outros();

    				transition_out(if_block4, 1, 1, () => {
    					if_block4 = null;
    				});

    				check_outros();
    			}

    			if (!/*showClearIcon*/ ctx[32] && (/*showIndicator*/ ctx[20] || /*showChevron*/ ctx[19] && !/*value*/ ctx[2] || !/*isSearchable*/ ctx[13] && !/*isDisabled*/ ctx[9] && !/*isWaiting*/ ctx[4] && (/*showSelectedItem*/ ctx[29] && !/*isClearable*/ ctx[15] || !/*showSelectedItem*/ ctx[29]))) {
    				if (if_block5) {
    					if_block5.p(ctx, dirty);
    				} else {
    					if_block5 = create_if_block_4(ctx);
    					if_block5.c();
    					if_block5.m(div, t6);
    				}
    			} else if (if_block5) {
    				if_block5.d(1);
    				if_block5 = null;
    			}

    			if (/*isWaiting*/ ctx[4]) {
    				if (if_block6) ; else {
    					if_block6 = create_if_block_3(ctx);
    					if_block6.c();
    					if_block6.m(div, t7);
    				}
    			} else if (if_block6) {
    				if_block6.d(1);
    				if_block6 = null;
    			}

    			if (/*listOpen*/ ctx[5]) {
    				if (if_block7) {
    					if_block7.p(ctx, dirty);

    					if (dirty[0] & /*listOpen*/ 32) {
    						transition_in(if_block7, 1);
    					}
    				} else {
    					if_block7 = create_if_block_2$1(ctx);
    					if_block7.c();
    					transition_in(if_block7, 1);
    					if_block7.m(div, t8);
    				}
    			} else if (if_block7) {
    				group_outros();

    				transition_out(if_block7, 1, 1, () => {
    					if_block7 = null;
    				});

    				check_outros();
    			}

    			if (!/*isMulti*/ ctx[7] || /*isMulti*/ ctx[7] && !/*showMultiSelect*/ ctx[34]) {
    				if (if_block8) {
    					if_block8.p(ctx, dirty);
    				} else {
    					if_block8 = create_if_block_1$1(ctx);
    					if_block8.c();
    					if_block8.m(div, t9);
    				}
    			} else if (if_block8) {
    				if_block8.d(1);
    				if_block8 = null;
    			}

    			if (/*isMulti*/ ctx[7] && /*showMultiSelect*/ ctx[34]) {
    				if (if_block9) {
    					if_block9.p(ctx, dirty);
    				} else {
    					if_block9 = create_if_block$2(ctx);
    					if_block9.c();
    					if_block9.m(div, null);
    				}
    			} else if (if_block9) {
    				if_block9.d(1);
    				if_block9 = null;
    			}

    			if (!current || dirty[0] & /*containerClasses*/ 2097152 && div_class_value !== (div_class_value = "selectContainer " + /*containerClasses*/ ctx[21] + " svelte-b8sh3g")) {
    				attr_dev(div, "class", div_class_value);
    			}

    			if (!current || dirty[0] & /*containerStyles*/ 2048) {
    				attr_dev(div, "style", /*containerStyles*/ ctx[11]);
    			}

    			if (dirty[0] & /*containerClasses, hasError*/ 2098176) {
    				toggle_class(div, "hasError", /*hasError*/ ctx[10]);
    			}

    			if (dirty[0] & /*containerClasses, isMulti*/ 2097280) {
    				toggle_class(div, "multiSelect", /*isMulti*/ ctx[7]);
    			}

    			if (dirty[0] & /*containerClasses, isDisabled*/ 2097664) {
    				toggle_class(div, "disabled", /*isDisabled*/ ctx[9]);
    			}

    			if (dirty[0] & /*containerClasses, isFocused*/ 2097154) {
    				toggle_class(div, "focused", /*isFocused*/ ctx[1]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block1);
    			transition_in(if_block2);
    			transition_in(if_block3);
    			transition_in(if_block4);
    			transition_in(if_block7);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block1);
    			transition_out(if_block2);
    			transition_out(if_block3);
    			transition_out(if_block4);
    			transition_out(if_block7);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    			/*input_1_binding*/ ctx[82](null);
    			if (if_block3) if_block3.d();
    			if (if_block4) if_block4.d();
    			if (if_block5) if_block5.d();
    			if (if_block6) if_block6.d();
    			if (if_block7) if_block7.d();
    			if (if_block8) if_block8.d();
    			if (if_block9) if_block9.d();
    			/*div_binding*/ ctx[85](null);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function convertStringItemsToObjects(_items) {
    	return _items.map((item, index) => {
    		return { index, value: item, label: `${item}` };
    	});
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Select", slots, []);
    	const dispatch = createEventDispatcher();
    	let { id = null } = $$props;
    	let { container = undefined } = $$props;
    	let { input = undefined } = $$props;
    	let { isMulti = false } = $$props;
    	let { multiFullItemClearable = false } = $$props;
    	let { isDisabled = false } = $$props;
    	let { isCreatable = false } = $$props;
    	let { isFocused = false } = $$props;
    	let { value = null } = $$props;
    	let { filterText = "" } = $$props;
    	let { placeholder = "Select..." } = $$props;
    	let { placeholderAlwaysShow = false } = $$props;
    	let { items = null } = $$props;
    	let { itemFilter = (label, filterText, option) => `${label}`.toLowerCase().includes(filterText.toLowerCase()) } = $$props;
    	let { groupBy = undefined } = $$props;
    	let { groupFilter = groups => groups } = $$props;
    	let { isGroupHeaderSelectable = false } = $$props;

    	let { getGroupHeaderLabel = option => {
    		return option[labelIdentifier] || option.id;
    	} } = $$props;

    	let { labelIdentifier = "label" } = $$props;

    	let { getOptionLabel = (option, filterText) => {
    		return option.isCreator
    		? `Create \"${filterText}\"`
    		: option[labelIdentifier];
    	} } = $$props;

    	let { optionIdentifier = "value" } = $$props;
    	let { loadOptions = undefined } = $$props;
    	let { hasError = false } = $$props;
    	let { containerStyles = "" } = $$props;

    	let { getSelectionLabel = option => {
    		if (option) return option[labelIdentifier]; else return null;
    	} } = $$props;

    	let { createGroupHeaderItem = groupValue => {
    		return { value: groupValue, label: groupValue };
    	} } = $$props;

    	let { createItem = filterText => {
    		return { value: filterText, label: filterText };
    	} } = $$props;

    	const getFilteredItems = () => {
    		return filteredItems;
    	};

    	let { isSearchable = true } = $$props;
    	let { inputStyles = "" } = $$props;
    	let { isClearable = true } = $$props;
    	let { isWaiting = false } = $$props;
    	let { listPlacement = "auto" } = $$props;
    	let { listOpen = false } = $$props;
    	let { isVirtualList = false } = $$props;
    	let { loadOptionsInterval = 300 } = $$props;
    	let { noOptionsMessage = "No options" } = $$props;
    	let { hideEmptyState = false } = $$props;
    	let { inputAttributes = {} } = $$props;
    	let { listAutoWidth = true } = $$props;
    	let { itemHeight = 40 } = $$props;
    	let { Icon = undefined } = $$props;
    	let { iconProps = {} } = $$props;
    	let { showChevron = false } = $$props;
    	let { showIndicator = false } = $$props;
    	let { containerClasses = "" } = $$props;
    	let { indicatorSvg = undefined } = $$props;
    	let { listOffset = 5 } = $$props;
    	let { ClearIcon: ClearIcon$1 = ClearIcon } = $$props;
    	let { Item: Item$1 = Item } = $$props;
    	let { List: List$1 = List } = $$props;
    	let { Selection: Selection$1 = Selection } = $$props;
    	let { MultiSelection: MultiSelection$1 = MultiSelection } = $$props;
    	let { VirtualList: VirtualList$1 = VirtualList } = $$props;

    	function filterMethod(args) {
    		if (args.loadOptions && args.filterText.length > 0) return;
    		if (!args.items) return [];

    		if (args.items && args.items.length > 0 && typeof args.items[0] !== "object") {
    			args.items = convertStringItemsToObjects(args.items);
    		}

    		let filterResults = args.items.filter(item => {
    			let matchesFilter = itemFilter(getOptionLabel(item, args.filterText), args.filterText, item);

    			if (matchesFilter && args.isMulti && args.value && Array.isArray(args.value)) {
    				matchesFilter = !args.value.some(x => {
    					return x[args.optionIdentifier] === item[args.optionIdentifier];
    				});
    			}

    			return matchesFilter;
    		});

    		if (args.groupBy) {
    			filterResults = filterGroupedItems(filterResults);
    		}

    		if (args.isCreatable) {
    			filterResults = addCreatableItem(filterResults, args.filterText);
    		}

    		return filterResults;
    	}

    	function addCreatableItem(_items, _filterText) {
    		if (_filterText.length === 0) return _items;
    		const itemToCreate = createItem(_filterText);
    		if (_items[0] && _filterText === _items[0][labelIdentifier]) return _items;
    		itemToCreate.isCreator = true;
    		return [..._items, itemToCreate];
    	}

    	let { selectedValue = null } = $$props;
    	let activeValue;
    	let prev_value;
    	let prev_filterText;
    	let prev_isFocused;
    	let prev_isMulti;
    	let hoverItemIndex;

    	const getItems = debounce(
    		async () => {
    			$$invalidate(4, isWaiting = true);

    			let res = await loadOptions(filterText).catch(err => {
    				console.warn("svelte-select loadOptions error :>> ", err);
    				dispatch("error", { type: "loadOptions", details: err });
    			});

    			if (res && !res.cancelled) {
    				if (res) {
    					if (res && res.length > 0 && typeof res[0] !== "object") {
    						res = convertStringItemsToObjects(res);
    					}

    					$$invalidate(81, filteredItems = [...res]);
    					dispatch("loaded", { items: filteredItems });
    				} else {
    					$$invalidate(81, filteredItems = []);
    				}

    				if (isCreatable) {
    					$$invalidate(81, filteredItems = addCreatableItem(filteredItems, filterText));
    				}

    				$$invalidate(4, isWaiting = false);
    				$$invalidate(1, isFocused = true);
    				$$invalidate(5, listOpen = true);
    			}
    		},
    		loadOptionsInterval
    	);

    	function setValue() {
    		if (typeof value === "string") {
    			$$invalidate(2, value = { [optionIdentifier]: value, label: value });
    		} else if (isMulti && Array.isArray(value) && value.length > 0) {
    			$$invalidate(2, value = value.map(item => typeof item === "string"
    			? { value: item, label: item }
    			: item));
    		}
    	}

    	let _inputAttributes;

    	function assignInputAttributes() {
    		$$invalidate(31, _inputAttributes = Object.assign(
    			{
    				autocapitalize: "none",
    				autocomplete: "off",
    				autocorrect: "off",
    				spellcheck: false,
    				tabindex: 0,
    				type: "text",
    				"aria-autocomplete": "list"
    			},
    			inputAttributes
    		));

    		if (id) {
    			$$invalidate(31, _inputAttributes.id = id, _inputAttributes);
    		}

    		if (!isSearchable) {
    			$$invalidate(31, _inputAttributes.readonly = true, _inputAttributes);
    		}
    	}

    	function filterGroupedItems(_items) {
    		const groupValues = [];
    		const groups = {};

    		_items.forEach(item => {
    			const groupValue = groupBy(item);

    			if (!groupValues.includes(groupValue)) {
    				groupValues.push(groupValue);
    				groups[groupValue] = [];

    				if (groupValue) {
    					groups[groupValue].push(Object.assign(createGroupHeaderItem(groupValue, item), {
    						id: groupValue,
    						isGroupHeader: true,
    						isSelectable: isGroupHeaderSelectable
    					}));
    				}
    			}

    			groups[groupValue].push(Object.assign({ isGroupItem: !!groupValue }, item));
    		});

    		const sortedGroupedItems = [];

    		groupFilter(groupValues).forEach(groupValue => {
    			sortedGroupedItems.push(...groups[groupValue]);
    		});

    		return sortedGroupedItems;
    	}

    	function dispatchSelectedItem() {
    		if (isMulti) {
    			if (JSON.stringify(value) !== JSON.stringify(prev_value)) {
    				if (checkValueForDuplicates()) {
    					dispatch("select", value);
    				}
    			}

    			return;
    		}

    		if (!prev_value || JSON.stringify(value[optionIdentifier]) !== JSON.stringify(prev_value[optionIdentifier])) {
    			dispatch("select", value);
    		}
    	}

    	function setupFocus() {
    		if (isFocused || listOpen) {
    			handleFocus();
    		} else {
    			if (input) input.blur();
    		}
    	}

    	function setupMulti() {
    		if (value) {
    			if (Array.isArray(value)) {
    				$$invalidate(2, value = [...value]);
    			} else {
    				$$invalidate(2, value = [value]);
    			}
    		}
    	}

    	function setupSingle() {
    		if (value) $$invalidate(2, value = null);
    	}

    	function setupFilterText() {
    		if (filterText.length === 0) return;
    		$$invalidate(1, isFocused = true);
    		$$invalidate(5, listOpen = true);

    		if (loadOptions) {
    			getItems();
    		} else {
    			$$invalidate(5, listOpen = true);

    			if (isMulti) {
    				$$invalidate(30, activeValue = undefined);
    			}
    		}
    	}

    	beforeUpdate(async () => {
    		$$invalidate(77, prev_value = value);
    		$$invalidate(78, prev_filterText = filterText);
    		$$invalidate(79, prev_isFocused = isFocused);
    		$$invalidate(80, prev_isMulti = isMulti);
    	});

    	function checkValueForDuplicates() {
    		let noDuplicates = true;

    		if (value) {
    			const ids = [];
    			const uniqueValues = [];

    			value.forEach(val => {
    				if (!ids.includes(val[optionIdentifier])) {
    					ids.push(val[optionIdentifier]);
    					uniqueValues.push(val);
    				} else {
    					noDuplicates = false;
    				}
    			});

    			if (!noDuplicates) $$invalidate(2, value = uniqueValues);
    		}

    		return noDuplicates;
    	}

    	function findItem(selection) {
    		let matchTo = selection
    		? selection[optionIdentifier]
    		: value[optionIdentifier];

    		return items.find(item => item[optionIdentifier] === matchTo);
    	}

    	function updateValueDisplay(items) {
    		if (!items || items.length === 0 || items.some(item => typeof item !== "object")) return;

    		if (!value || (isMulti
    		? value.some(selection => !selection || !selection[optionIdentifier])
    		: !value[optionIdentifier])) return;

    		if (Array.isArray(value)) {
    			$$invalidate(2, value = value.map(selection => findItem(selection) || selection));
    		} else {
    			$$invalidate(2, value = findItem() || value);
    		}
    	}

    	function handleMultiItemClear(event) {
    		const { detail } = event;
    		const itemToRemove = value[detail ? detail.i : value.length - 1];

    		if (value.length === 1) {
    			$$invalidate(2, value = undefined);
    		} else {
    			$$invalidate(2, value = value.filter(item => {
    				return item !== itemToRemove;
    			}));
    		}

    		dispatch("clear", itemToRemove);
    	}

    	function handleKeyDown(e) {
    		if (!isFocused) return;

    		switch (e.key) {
    			case "ArrowDown":
    				e.preventDefault();
    				$$invalidate(5, listOpen = true);
    				$$invalidate(30, activeValue = undefined);
    				break;
    			case "ArrowUp":
    				e.preventDefault();
    				$$invalidate(5, listOpen = true);
    				$$invalidate(30, activeValue = undefined);
    				break;
    			case "Tab":
    				if (!listOpen) $$invalidate(1, isFocused = false);
    				break;
    			case "Backspace":
    				if (!isMulti || filterText.length > 0) return;
    				if (isMulti && value && value.length > 0) {
    					handleMultiItemClear(activeValue !== undefined
    					? activeValue
    					: value.length - 1);

    					if (activeValue === 0 || activeValue === undefined) break;
    					$$invalidate(30, activeValue = value.length > activeValue ? activeValue - 1 : undefined);
    				}
    				break;
    			case "ArrowLeft":
    				if (!isMulti || filterText.length > 0) return;
    				if (activeValue === undefined) {
    					$$invalidate(30, activeValue = value.length - 1);
    				} else if (value.length > activeValue && activeValue !== 0) {
    					$$invalidate(30, activeValue -= 1);
    				}
    				break;
    			case "ArrowRight":
    				if (!isMulti || filterText.length > 0 || activeValue === undefined) return;
    				if (activeValue === value.length - 1) {
    					$$invalidate(30, activeValue = undefined);
    				} else if (activeValue < value.length - 1) {
    					$$invalidate(30, activeValue += 1);
    				}
    				break;
    		}
    	}

    	function handleFocus() {
    		$$invalidate(1, isFocused = true);
    		if (input) input.focus();
    	}

    	function handleWindowEvent(event) {
    		if (!container) return;

    		const eventTarget = event.path && event.path.length > 0
    		? event.path[0]
    		: event.target;

    		if (container.contains(eventTarget)) return;
    		$$invalidate(1, isFocused = false);
    		$$invalidate(5, listOpen = false);
    		$$invalidate(30, activeValue = undefined);
    		if (input) input.blur();
    	}

    	function handleClick() {
    		if (isDisabled) return;
    		$$invalidate(1, isFocused = true);
    		$$invalidate(5, listOpen = !listOpen);
    	}

    	function handleClear() {
    		$$invalidate(2, value = undefined);
    		$$invalidate(5, listOpen = false);
    		dispatch("clear", value);
    		handleFocus();
    	}

    	onMount(() => {
    		if (isFocused && input) input.focus();
    	});

    	function itemSelected(event) {
    		const { detail } = event;

    		if (detail) {
    			$$invalidate(3, filterText = "");
    			const item = Object.assign({}, detail);

    			if (!item.isGroupHeader || item.isSelectable) {
    				if (isMulti) {
    					$$invalidate(2, value = value ? value.concat([item]) : [item]);
    				} else {
    					$$invalidate(2, value = item);
    				}

    				$$invalidate(2, value);

    				setTimeout(() => {
    					$$invalidate(5, listOpen = false);
    					$$invalidate(30, activeValue = undefined);
    				});
    			}
    		}
    	}

    	function itemCreated(event) {
    		const { detail } = event;

    		if (isMulti) {
    			$$invalidate(2, value = value || []);
    			$$invalidate(2, value = [...value, createItem(detail)]);
    		} else {
    			$$invalidate(2, value = createItem(detail));
    		}

    		dispatch("itemCreated", detail);
    		$$invalidate(3, filterText = "");
    		$$invalidate(5, listOpen = false);
    		$$invalidate(30, activeValue = undefined);
    	}

    	function closeList() {
    		$$invalidate(3, filterText = "");
    		$$invalidate(5, listOpen = false);
    	}

    	let { ariaValues = values => {
    		return `Option ${values}, selected.`;
    	} } = $$props;

    	let { ariaListOpen = (label, count) => {
    		return `You are currently focused on option ${label}. There are ${count} results available.`;
    	} } = $$props;

    	let { ariaFocused = () => {
    		return `Select is focused, type to refine list, press down to open the menu.`;
    	} } = $$props;

    	function handleAriaSelection() {
    		let selected = undefined;

    		if (isMulti && value.length > 0) {
    			selected = value.map(v => getSelectionLabel(v)).join(", ");
    		} else {
    			selected = getSelectionLabel(value);
    		}

    		return ariaValues(selected);
    	}

    	function handleAriaContent() {
    		if (!isFocused || !filteredItems || filteredItems.length === 0) return "";
    		let _item = filteredItems[hoverItemIndex];

    		if (listOpen && _item) {
    			let label = getSelectionLabel(_item);
    			let count = filteredItems ? filteredItems.length : 0;
    			return ariaListOpen(label, count);
    		} else {
    			return ariaFocused();
    		}
    	}

    	const writable_props = [
    		"id",
    		"container",
    		"input",
    		"isMulti",
    		"multiFullItemClearable",
    		"isDisabled",
    		"isCreatable",
    		"isFocused",
    		"value",
    		"filterText",
    		"placeholder",
    		"placeholderAlwaysShow",
    		"items",
    		"itemFilter",
    		"groupBy",
    		"groupFilter",
    		"isGroupHeaderSelectable",
    		"getGroupHeaderLabel",
    		"labelIdentifier",
    		"getOptionLabel",
    		"optionIdentifier",
    		"loadOptions",
    		"hasError",
    		"containerStyles",
    		"getSelectionLabel",
    		"createGroupHeaderItem",
    		"createItem",
    		"isSearchable",
    		"inputStyles",
    		"isClearable",
    		"isWaiting",
    		"listPlacement",
    		"listOpen",
    		"isVirtualList",
    		"loadOptionsInterval",
    		"noOptionsMessage",
    		"hideEmptyState",
    		"inputAttributes",
    		"listAutoWidth",
    		"itemHeight",
    		"Icon",
    		"iconProps",
    		"showChevron",
    		"showIndicator",
    		"containerClasses",
    		"indicatorSvg",
    		"listOffset",
    		"ClearIcon",
    		"Item",
    		"List",
    		"Selection",
    		"MultiSelection",
    		"VirtualList",
    		"selectedValue",
    		"ariaValues",
    		"ariaListOpen",
    		"ariaFocused"
    	];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<Select> was created with unknown prop '${key}'`);
    	});

    	function input_1_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			input = $$value;
    			$$invalidate(6, input);
    		});
    	}

    	function input_1_input_handler() {
    		filterText = this.value;
    		$$invalidate(3, filterText);
    	}

    	function switch_instance_hoverItemIndex_binding(value) {
    		hoverItemIndex = value;
    		$$invalidate(28, hoverItemIndex);
    	}

    	function div_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			container = $$value;
    			$$invalidate(0, container);
    		});
    	}

    	$$self.$$set = $$props => {
    		if ("id" in $$props) $$invalidate(46, id = $$props.id);
    		if ("container" in $$props) $$invalidate(0, container = $$props.container);
    		if ("input" in $$props) $$invalidate(6, input = $$props.input);
    		if ("isMulti" in $$props) $$invalidate(7, isMulti = $$props.isMulti);
    		if ("multiFullItemClearable" in $$props) $$invalidate(8, multiFullItemClearable = $$props.multiFullItemClearable);
    		if ("isDisabled" in $$props) $$invalidate(9, isDisabled = $$props.isDisabled);
    		if ("isCreatable" in $$props) $$invalidate(47, isCreatable = $$props.isCreatable);
    		if ("isFocused" in $$props) $$invalidate(1, isFocused = $$props.isFocused);
    		if ("value" in $$props) $$invalidate(2, value = $$props.value);
    		if ("filterText" in $$props) $$invalidate(3, filterText = $$props.filterText);
    		if ("placeholder" in $$props) $$invalidate(48, placeholder = $$props.placeholder);
    		if ("placeholderAlwaysShow" in $$props) $$invalidate(49, placeholderAlwaysShow = $$props.placeholderAlwaysShow);
    		if ("items" in $$props) $$invalidate(50, items = $$props.items);
    		if ("itemFilter" in $$props) $$invalidate(51, itemFilter = $$props.itemFilter);
    		if ("groupBy" in $$props) $$invalidate(52, groupBy = $$props.groupBy);
    		if ("groupFilter" in $$props) $$invalidate(53, groupFilter = $$props.groupFilter);
    		if ("isGroupHeaderSelectable" in $$props) $$invalidate(54, isGroupHeaderSelectable = $$props.isGroupHeaderSelectable);
    		if ("getGroupHeaderLabel" in $$props) $$invalidate(55, getGroupHeaderLabel = $$props.getGroupHeaderLabel);
    		if ("labelIdentifier" in $$props) $$invalidate(56, labelIdentifier = $$props.labelIdentifier);
    		if ("getOptionLabel" in $$props) $$invalidate(57, getOptionLabel = $$props.getOptionLabel);
    		if ("optionIdentifier" in $$props) $$invalidate(58, optionIdentifier = $$props.optionIdentifier);
    		if ("loadOptions" in $$props) $$invalidate(59, loadOptions = $$props.loadOptions);
    		if ("hasError" in $$props) $$invalidate(10, hasError = $$props.hasError);
    		if ("containerStyles" in $$props) $$invalidate(11, containerStyles = $$props.containerStyles);
    		if ("getSelectionLabel" in $$props) $$invalidate(12, getSelectionLabel = $$props.getSelectionLabel);
    		if ("createGroupHeaderItem" in $$props) $$invalidate(60, createGroupHeaderItem = $$props.createGroupHeaderItem);
    		if ("createItem" in $$props) $$invalidate(61, createItem = $$props.createItem);
    		if ("isSearchable" in $$props) $$invalidate(13, isSearchable = $$props.isSearchable);
    		if ("inputStyles" in $$props) $$invalidate(14, inputStyles = $$props.inputStyles);
    		if ("isClearable" in $$props) $$invalidate(15, isClearable = $$props.isClearable);
    		if ("isWaiting" in $$props) $$invalidate(4, isWaiting = $$props.isWaiting);
    		if ("listPlacement" in $$props) $$invalidate(63, listPlacement = $$props.listPlacement);
    		if ("listOpen" in $$props) $$invalidate(5, listOpen = $$props.listOpen);
    		if ("isVirtualList" in $$props) $$invalidate(64, isVirtualList = $$props.isVirtualList);
    		if ("loadOptionsInterval" in $$props) $$invalidate(65, loadOptionsInterval = $$props.loadOptionsInterval);
    		if ("noOptionsMessage" in $$props) $$invalidate(66, noOptionsMessage = $$props.noOptionsMessage);
    		if ("hideEmptyState" in $$props) $$invalidate(67, hideEmptyState = $$props.hideEmptyState);
    		if ("inputAttributes" in $$props) $$invalidate(16, inputAttributes = $$props.inputAttributes);
    		if ("listAutoWidth" in $$props) $$invalidate(68, listAutoWidth = $$props.listAutoWidth);
    		if ("itemHeight" in $$props) $$invalidate(69, itemHeight = $$props.itemHeight);
    		if ("Icon" in $$props) $$invalidate(17, Icon = $$props.Icon);
    		if ("iconProps" in $$props) $$invalidate(18, iconProps = $$props.iconProps);
    		if ("showChevron" in $$props) $$invalidate(19, showChevron = $$props.showChevron);
    		if ("showIndicator" in $$props) $$invalidate(20, showIndicator = $$props.showIndicator);
    		if ("containerClasses" in $$props) $$invalidate(21, containerClasses = $$props.containerClasses);
    		if ("indicatorSvg" in $$props) $$invalidate(22, indicatorSvg = $$props.indicatorSvg);
    		if ("listOffset" in $$props) $$invalidate(70, listOffset = $$props.listOffset);
    		if ("ClearIcon" in $$props) $$invalidate(23, ClearIcon$1 = $$props.ClearIcon);
    		if ("Item" in $$props) $$invalidate(71, Item$1 = $$props.Item);
    		if ("List" in $$props) $$invalidate(24, List$1 = $$props.List);
    		if ("Selection" in $$props) $$invalidate(25, Selection$1 = $$props.Selection);
    		if ("MultiSelection" in $$props) $$invalidate(26, MultiSelection$1 = $$props.MultiSelection);
    		if ("VirtualList" in $$props) $$invalidate(72, VirtualList$1 = $$props.VirtualList);
    		if ("selectedValue" in $$props) $$invalidate(73, selectedValue = $$props.selectedValue);
    		if ("ariaValues" in $$props) $$invalidate(74, ariaValues = $$props.ariaValues);
    		if ("ariaListOpen" in $$props) $$invalidate(75, ariaListOpen = $$props.ariaListOpen);
    		if ("ariaFocused" in $$props) $$invalidate(76, ariaFocused = $$props.ariaFocused);
    	};

    	$$self.$capture_state = () => ({
    		beforeUpdate,
    		createEventDispatcher,
    		onMount,
    		_List: List,
    		_Item: Item,
    		_Selection: Selection,
    		_MultiSelection: MultiSelection,
    		_VirtualList: VirtualList,
    		_ClearIcon: ClearIcon,
    		debounce,
    		dispatch,
    		id,
    		container,
    		input,
    		isMulti,
    		multiFullItemClearable,
    		isDisabled,
    		isCreatable,
    		isFocused,
    		value,
    		filterText,
    		placeholder,
    		placeholderAlwaysShow,
    		items,
    		itemFilter,
    		groupBy,
    		groupFilter,
    		isGroupHeaderSelectable,
    		getGroupHeaderLabel,
    		labelIdentifier,
    		getOptionLabel,
    		optionIdentifier,
    		loadOptions,
    		hasError,
    		containerStyles,
    		getSelectionLabel,
    		createGroupHeaderItem,
    		createItem,
    		getFilteredItems,
    		isSearchable,
    		inputStyles,
    		isClearable,
    		isWaiting,
    		listPlacement,
    		listOpen,
    		isVirtualList,
    		loadOptionsInterval,
    		noOptionsMessage,
    		hideEmptyState,
    		inputAttributes,
    		listAutoWidth,
    		itemHeight,
    		Icon,
    		iconProps,
    		showChevron,
    		showIndicator,
    		containerClasses,
    		indicatorSvg,
    		listOffset,
    		ClearIcon: ClearIcon$1,
    		Item: Item$1,
    		List: List$1,
    		Selection: Selection$1,
    		MultiSelection: MultiSelection$1,
    		VirtualList: VirtualList$1,
    		filterMethod,
    		addCreatableItem,
    		selectedValue,
    		activeValue,
    		prev_value,
    		prev_filterText,
    		prev_isFocused,
    		prev_isMulti,
    		hoverItemIndex,
    		getItems,
    		setValue,
    		_inputAttributes,
    		assignInputAttributes,
    		convertStringItemsToObjects,
    		filterGroupedItems,
    		dispatchSelectedItem,
    		setupFocus,
    		setupMulti,
    		setupSingle,
    		setupFilterText,
    		checkValueForDuplicates,
    		findItem,
    		updateValueDisplay,
    		handleMultiItemClear,
    		handleKeyDown,
    		handleFocus,
    		handleWindowEvent,
    		handleClick,
    		handleClear,
    		itemSelected,
    		itemCreated,
    		closeList,
    		ariaValues,
    		ariaListOpen,
    		ariaFocused,
    		handleAriaSelection,
    		handleAriaContent,
    		filteredItems,
    		showSelectedItem,
    		showClearIcon,
    		placeholderText,
    		showMultiSelect,
    		listProps,
    		ariaSelection,
    		ariaContext
    	});

    	$$self.$inject_state = $$props => {
    		if ("id" in $$props) $$invalidate(46, id = $$props.id);
    		if ("container" in $$props) $$invalidate(0, container = $$props.container);
    		if ("input" in $$props) $$invalidate(6, input = $$props.input);
    		if ("isMulti" in $$props) $$invalidate(7, isMulti = $$props.isMulti);
    		if ("multiFullItemClearable" in $$props) $$invalidate(8, multiFullItemClearable = $$props.multiFullItemClearable);
    		if ("isDisabled" in $$props) $$invalidate(9, isDisabled = $$props.isDisabled);
    		if ("isCreatable" in $$props) $$invalidate(47, isCreatable = $$props.isCreatable);
    		if ("isFocused" in $$props) $$invalidate(1, isFocused = $$props.isFocused);
    		if ("value" in $$props) $$invalidate(2, value = $$props.value);
    		if ("filterText" in $$props) $$invalidate(3, filterText = $$props.filterText);
    		if ("placeholder" in $$props) $$invalidate(48, placeholder = $$props.placeholder);
    		if ("placeholderAlwaysShow" in $$props) $$invalidate(49, placeholderAlwaysShow = $$props.placeholderAlwaysShow);
    		if ("items" in $$props) $$invalidate(50, items = $$props.items);
    		if ("itemFilter" in $$props) $$invalidate(51, itemFilter = $$props.itemFilter);
    		if ("groupBy" in $$props) $$invalidate(52, groupBy = $$props.groupBy);
    		if ("groupFilter" in $$props) $$invalidate(53, groupFilter = $$props.groupFilter);
    		if ("isGroupHeaderSelectable" in $$props) $$invalidate(54, isGroupHeaderSelectable = $$props.isGroupHeaderSelectable);
    		if ("getGroupHeaderLabel" in $$props) $$invalidate(55, getGroupHeaderLabel = $$props.getGroupHeaderLabel);
    		if ("labelIdentifier" in $$props) $$invalidate(56, labelIdentifier = $$props.labelIdentifier);
    		if ("getOptionLabel" in $$props) $$invalidate(57, getOptionLabel = $$props.getOptionLabel);
    		if ("optionIdentifier" in $$props) $$invalidate(58, optionIdentifier = $$props.optionIdentifier);
    		if ("loadOptions" in $$props) $$invalidate(59, loadOptions = $$props.loadOptions);
    		if ("hasError" in $$props) $$invalidate(10, hasError = $$props.hasError);
    		if ("containerStyles" in $$props) $$invalidate(11, containerStyles = $$props.containerStyles);
    		if ("getSelectionLabel" in $$props) $$invalidate(12, getSelectionLabel = $$props.getSelectionLabel);
    		if ("createGroupHeaderItem" in $$props) $$invalidate(60, createGroupHeaderItem = $$props.createGroupHeaderItem);
    		if ("createItem" in $$props) $$invalidate(61, createItem = $$props.createItem);
    		if ("isSearchable" in $$props) $$invalidate(13, isSearchable = $$props.isSearchable);
    		if ("inputStyles" in $$props) $$invalidate(14, inputStyles = $$props.inputStyles);
    		if ("isClearable" in $$props) $$invalidate(15, isClearable = $$props.isClearable);
    		if ("isWaiting" in $$props) $$invalidate(4, isWaiting = $$props.isWaiting);
    		if ("listPlacement" in $$props) $$invalidate(63, listPlacement = $$props.listPlacement);
    		if ("listOpen" in $$props) $$invalidate(5, listOpen = $$props.listOpen);
    		if ("isVirtualList" in $$props) $$invalidate(64, isVirtualList = $$props.isVirtualList);
    		if ("loadOptionsInterval" in $$props) $$invalidate(65, loadOptionsInterval = $$props.loadOptionsInterval);
    		if ("noOptionsMessage" in $$props) $$invalidate(66, noOptionsMessage = $$props.noOptionsMessage);
    		if ("hideEmptyState" in $$props) $$invalidate(67, hideEmptyState = $$props.hideEmptyState);
    		if ("inputAttributes" in $$props) $$invalidate(16, inputAttributes = $$props.inputAttributes);
    		if ("listAutoWidth" in $$props) $$invalidate(68, listAutoWidth = $$props.listAutoWidth);
    		if ("itemHeight" in $$props) $$invalidate(69, itemHeight = $$props.itemHeight);
    		if ("Icon" in $$props) $$invalidate(17, Icon = $$props.Icon);
    		if ("iconProps" in $$props) $$invalidate(18, iconProps = $$props.iconProps);
    		if ("showChevron" in $$props) $$invalidate(19, showChevron = $$props.showChevron);
    		if ("showIndicator" in $$props) $$invalidate(20, showIndicator = $$props.showIndicator);
    		if ("containerClasses" in $$props) $$invalidate(21, containerClasses = $$props.containerClasses);
    		if ("indicatorSvg" in $$props) $$invalidate(22, indicatorSvg = $$props.indicatorSvg);
    		if ("listOffset" in $$props) $$invalidate(70, listOffset = $$props.listOffset);
    		if ("ClearIcon" in $$props) $$invalidate(23, ClearIcon$1 = $$props.ClearIcon);
    		if ("Item" in $$props) $$invalidate(71, Item$1 = $$props.Item);
    		if ("List" in $$props) $$invalidate(24, List$1 = $$props.List);
    		if ("Selection" in $$props) $$invalidate(25, Selection$1 = $$props.Selection);
    		if ("MultiSelection" in $$props) $$invalidate(26, MultiSelection$1 = $$props.MultiSelection);
    		if ("VirtualList" in $$props) $$invalidate(72, VirtualList$1 = $$props.VirtualList);
    		if ("selectedValue" in $$props) $$invalidate(73, selectedValue = $$props.selectedValue);
    		if ("activeValue" in $$props) $$invalidate(30, activeValue = $$props.activeValue);
    		if ("prev_value" in $$props) $$invalidate(77, prev_value = $$props.prev_value);
    		if ("prev_filterText" in $$props) $$invalidate(78, prev_filterText = $$props.prev_filterText);
    		if ("prev_isFocused" in $$props) $$invalidate(79, prev_isFocused = $$props.prev_isFocused);
    		if ("prev_isMulti" in $$props) $$invalidate(80, prev_isMulti = $$props.prev_isMulti);
    		if ("hoverItemIndex" in $$props) $$invalidate(28, hoverItemIndex = $$props.hoverItemIndex);
    		if ("_inputAttributes" in $$props) $$invalidate(31, _inputAttributes = $$props._inputAttributes);
    		if ("ariaValues" in $$props) $$invalidate(74, ariaValues = $$props.ariaValues);
    		if ("ariaListOpen" in $$props) $$invalidate(75, ariaListOpen = $$props.ariaListOpen);
    		if ("ariaFocused" in $$props) $$invalidate(76, ariaFocused = $$props.ariaFocused);
    		if ("filteredItems" in $$props) $$invalidate(81, filteredItems = $$props.filteredItems);
    		if ("showSelectedItem" in $$props) $$invalidate(29, showSelectedItem = $$props.showSelectedItem);
    		if ("showClearIcon" in $$props) $$invalidate(32, showClearIcon = $$props.showClearIcon);
    		if ("placeholderText" in $$props) $$invalidate(33, placeholderText = $$props.placeholderText);
    		if ("showMultiSelect" in $$props) $$invalidate(34, showMultiSelect = $$props.showMultiSelect);
    		if ("listProps" in $$props) $$invalidate(35, listProps = $$props.listProps);
    		if ("ariaSelection" in $$props) $$invalidate(36, ariaSelection = $$props.ariaSelection);
    		if ("ariaContext" in $$props) $$invalidate(37, ariaContext = $$props.ariaContext);
    	};

    	let filteredItems;
    	let showSelectedItem;
    	let showClearIcon;
    	let placeholderText;
    	let showMultiSelect;
    	let listProps;
    	let ariaSelection;
    	let ariaContext;

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*filterText, value, isMulti*/ 140 | $$self.$$.dirty[1] & /*loadOptions, items, optionIdentifier, groupBy, isCreatable*/ 405340160) {
    			 $$invalidate(81, filteredItems = filterMethod({
    				loadOptions,
    				filterText,
    				items,
    				value,
    				isMulti,
    				optionIdentifier,
    				groupBy,
    				isCreatable
    			}));
    		}

    		if ($$self.$$.dirty[2] & /*selectedValue*/ 2048) {
    			 {
    				if (selectedValue) console.warn("selectedValue is no longer used. Please use value instead.");
    			}
    		}

    		if ($$self.$$.dirty[1] & /*items*/ 524288) {
    			 updateValueDisplay(items);
    		}

    		if ($$self.$$.dirty[0] & /*value*/ 4) {
    			 {
    				if (value) setValue();
    			}
    		}

    		if ($$self.$$.dirty[0] & /*inputAttributes, isSearchable*/ 73728) {
    			 {
    				if (inputAttributes || !isSearchable) assignInputAttributes();
    			}
    		}

    		if ($$self.$$.dirty[0] & /*isMulti*/ 128 | $$self.$$.dirty[2] & /*prev_isMulti*/ 262144) {
    			 {
    				if (isMulti) {
    					setupMulti();
    				}

    				if (prev_isMulti && !isMulti) {
    					setupSingle();
    				}
    			}
    		}

    		if ($$self.$$.dirty[0] & /*isMulti, value*/ 132) {
    			 {
    				if (isMulti && value && value.length > 1) {
    					checkValueForDuplicates();
    				}
    			}
    		}

    		if ($$self.$$.dirty[0] & /*value*/ 4) {
    			 {
    				if (value) dispatchSelectedItem();
    			}
    		}

    		if ($$self.$$.dirty[0] & /*value, isMulti*/ 132 | $$self.$$.dirty[2] & /*prev_value*/ 32768) {
    			 {
    				if (!value && isMulti && prev_value) {
    					dispatch("select", value);
    				}
    			}
    		}

    		if ($$self.$$.dirty[0] & /*isFocused*/ 2 | $$self.$$.dirty[2] & /*prev_isFocused*/ 131072) {
    			 {
    				if (isFocused !== prev_isFocused) {
    					setupFocus();
    				}
    			}
    		}

    		if ($$self.$$.dirty[0] & /*filterText*/ 8 | $$self.$$.dirty[2] & /*prev_filterText*/ 65536) {
    			 {
    				if (filterText !== prev_filterText) {
    					setupFilterText();
    				}
    			}
    		}

    		if ($$self.$$.dirty[0] & /*value, filterText*/ 12) {
    			 $$invalidate(29, showSelectedItem = value && filterText.length === 0);
    		}

    		if ($$self.$$.dirty[0] & /*showSelectedItem, isClearable, isDisabled, isWaiting*/ 536904208) {
    			 $$invalidate(32, showClearIcon = showSelectedItem && isClearable && !isDisabled && !isWaiting);
    		}

    		if ($$self.$$.dirty[0] & /*isMulti, value*/ 132 | $$self.$$.dirty[1] & /*placeholderAlwaysShow, placeholder*/ 393216) {
    			 $$invalidate(33, placeholderText = placeholderAlwaysShow && isMulti
    			? placeholder
    			: value ? "" : placeholder);
    		}

    		if ($$self.$$.dirty[0] & /*isMulti, value*/ 132) {
    			 $$invalidate(34, showMultiSelect = isMulti && value && value.length > 0);
    		}

    		if ($$self.$$.dirty[0] & /*filterText, value, isMulti, container*/ 141 | $$self.$$.dirty[1] & /*optionIdentifier, getGroupHeaderLabel, getOptionLabel*/ 218103808 | $$self.$$.dirty[2] & /*Item, noOptionsMessage, hideEmptyState, isVirtualList, VirtualList, filteredItems, itemHeight, listPlacement, listAutoWidth, listOffset*/ 526326) {
    			 $$invalidate(35, listProps = {
    				Item: Item$1,
    				filterText,
    				optionIdentifier,
    				noOptionsMessage,
    				hideEmptyState,
    				isVirtualList,
    				VirtualList: VirtualList$1,
    				value,
    				isMulti,
    				getGroupHeaderLabel,
    				items: filteredItems,
    				itemHeight,
    				getOptionLabel,
    				listPlacement,
    				parent: container,
    				listAutoWidth,
    				listOffset
    			});
    		}

    		if ($$self.$$.dirty[0] & /*value, isMulti*/ 132) {
    			 $$invalidate(36, ariaSelection = value ? handleAriaSelection() : "");
    		}

    		if ($$self.$$.dirty[0] & /*hoverItemIndex, isFocused, listOpen*/ 268435490 | $$self.$$.dirty[2] & /*filteredItems*/ 524288) {
    			 $$invalidate(37, ariaContext = handleAriaContent());
    		}
    	};

    	return [
    		container,
    		isFocused,
    		value,
    		filterText,
    		isWaiting,
    		listOpen,
    		input,
    		isMulti,
    		multiFullItemClearable,
    		isDisabled,
    		hasError,
    		containerStyles,
    		getSelectionLabel,
    		isSearchable,
    		inputStyles,
    		isClearable,
    		inputAttributes,
    		Icon,
    		iconProps,
    		showChevron,
    		showIndicator,
    		containerClasses,
    		indicatorSvg,
    		ClearIcon$1,
    		List$1,
    		Selection$1,
    		MultiSelection$1,
    		handleClear,
    		hoverItemIndex,
    		showSelectedItem,
    		activeValue,
    		_inputAttributes,
    		showClearIcon,
    		placeholderText,
    		showMultiSelect,
    		listProps,
    		ariaSelection,
    		ariaContext,
    		handleMultiItemClear,
    		handleKeyDown,
    		handleFocus,
    		handleWindowEvent,
    		handleClick,
    		itemSelected,
    		itemCreated,
    		closeList,
    		id,
    		isCreatable,
    		placeholder,
    		placeholderAlwaysShow,
    		items,
    		itemFilter,
    		groupBy,
    		groupFilter,
    		isGroupHeaderSelectable,
    		getGroupHeaderLabel,
    		labelIdentifier,
    		getOptionLabel,
    		optionIdentifier,
    		loadOptions,
    		createGroupHeaderItem,
    		createItem,
    		getFilteredItems,
    		listPlacement,
    		isVirtualList,
    		loadOptionsInterval,
    		noOptionsMessage,
    		hideEmptyState,
    		listAutoWidth,
    		itemHeight,
    		listOffset,
    		Item$1,
    		VirtualList$1,
    		selectedValue,
    		ariaValues,
    		ariaListOpen,
    		ariaFocused,
    		prev_value,
    		prev_filterText,
    		prev_isFocused,
    		prev_isMulti,
    		filteredItems,
    		input_1_binding,
    		input_1_input_handler,
    		switch_instance_hoverItemIndex_binding,
    		div_binding
    	];
    }

    class Select extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(
    			this,
    			options,
    			instance$6,
    			create_fragment$6,
    			safe_not_equal,
    			{
    				id: 46,
    				container: 0,
    				input: 6,
    				isMulti: 7,
    				multiFullItemClearable: 8,
    				isDisabled: 9,
    				isCreatable: 47,
    				isFocused: 1,
    				value: 2,
    				filterText: 3,
    				placeholder: 48,
    				placeholderAlwaysShow: 49,
    				items: 50,
    				itemFilter: 51,
    				groupBy: 52,
    				groupFilter: 53,
    				isGroupHeaderSelectable: 54,
    				getGroupHeaderLabel: 55,
    				labelIdentifier: 56,
    				getOptionLabel: 57,
    				optionIdentifier: 58,
    				loadOptions: 59,
    				hasError: 10,
    				containerStyles: 11,
    				getSelectionLabel: 12,
    				createGroupHeaderItem: 60,
    				createItem: 61,
    				getFilteredItems: 62,
    				isSearchable: 13,
    				inputStyles: 14,
    				isClearable: 15,
    				isWaiting: 4,
    				listPlacement: 63,
    				listOpen: 5,
    				isVirtualList: 64,
    				loadOptionsInterval: 65,
    				noOptionsMessage: 66,
    				hideEmptyState: 67,
    				inputAttributes: 16,
    				listAutoWidth: 68,
    				itemHeight: 69,
    				Icon: 17,
    				iconProps: 18,
    				showChevron: 19,
    				showIndicator: 20,
    				containerClasses: 21,
    				indicatorSvg: 22,
    				listOffset: 70,
    				ClearIcon: 23,
    				Item: 71,
    				List: 24,
    				Selection: 25,
    				MultiSelection: 26,
    				VirtualList: 72,
    				selectedValue: 73,
    				handleClear: 27,
    				ariaValues: 74,
    				ariaListOpen: 75,
    				ariaFocused: 76
    			},
    			[-1, -1, -1, -1]
    		);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Select",
    			options,
    			id: create_fragment$6.name
    		});
    	}

    	get id() {
    		throw new Error("<Select>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set id(value) {
    		throw new Error("<Select>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get container() {
    		throw new Error("<Select>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set container(value) {
    		throw new Error("<Select>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get input() {
    		throw new Error("<Select>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set input(value) {
    		throw new Error("<Select>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get isMulti() {
    		throw new Error("<Select>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set isMulti(value) {
    		throw new Error("<Select>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get multiFullItemClearable() {
    		throw new Error("<Select>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set multiFullItemClearable(value) {
    		throw new Error("<Select>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get isDisabled() {
    		throw new Error("<Select>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set isDisabled(value) {
    		throw new Error("<Select>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get isCreatable() {
    		throw new Error("<Select>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set isCreatable(value) {
    		throw new Error("<Select>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get isFocused() {
    		throw new Error("<Select>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set isFocused(value) {
    		throw new Error("<Select>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get value() {
    		throw new Error("<Select>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set value(value) {
    		throw new Error("<Select>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get filterText() {
    		throw new Error("<Select>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set filterText(value) {
    		throw new Error("<Select>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get placeholder() {
    		throw new Error("<Select>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set placeholder(value) {
    		throw new Error("<Select>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get placeholderAlwaysShow() {
    		throw new Error("<Select>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set placeholderAlwaysShow(value) {
    		throw new Error("<Select>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get items() {
    		throw new Error("<Select>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set items(value) {
    		throw new Error("<Select>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get itemFilter() {
    		throw new Error("<Select>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set itemFilter(value) {
    		throw new Error("<Select>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get groupBy() {
    		throw new Error("<Select>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set groupBy(value) {
    		throw new Error("<Select>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get groupFilter() {
    		throw new Error("<Select>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set groupFilter(value) {
    		throw new Error("<Select>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get isGroupHeaderSelectable() {
    		throw new Error("<Select>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set isGroupHeaderSelectable(value) {
    		throw new Error("<Select>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get getGroupHeaderLabel() {
    		throw new Error("<Select>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set getGroupHeaderLabel(value) {
    		throw new Error("<Select>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get labelIdentifier() {
    		throw new Error("<Select>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set labelIdentifier(value) {
    		throw new Error("<Select>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get getOptionLabel() {
    		throw new Error("<Select>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set getOptionLabel(value) {
    		throw new Error("<Select>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get optionIdentifier() {
    		throw new Error("<Select>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set optionIdentifier(value) {
    		throw new Error("<Select>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get loadOptions() {
    		throw new Error("<Select>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set loadOptions(value) {
    		throw new Error("<Select>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get hasError() {
    		throw new Error("<Select>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set hasError(value) {
    		throw new Error("<Select>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get containerStyles() {
    		throw new Error("<Select>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set containerStyles(value) {
    		throw new Error("<Select>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get getSelectionLabel() {
    		throw new Error("<Select>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set getSelectionLabel(value) {
    		throw new Error("<Select>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get createGroupHeaderItem() {
    		throw new Error("<Select>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set createGroupHeaderItem(value) {
    		throw new Error("<Select>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get createItem() {
    		throw new Error("<Select>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set createItem(value) {
    		throw new Error("<Select>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get getFilteredItems() {
    		return this.$$.ctx[62];
    	}

    	set getFilteredItems(value) {
    		throw new Error("<Select>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get isSearchable() {
    		throw new Error("<Select>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set isSearchable(value) {
    		throw new Error("<Select>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get inputStyles() {
    		throw new Error("<Select>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set inputStyles(value) {
    		throw new Error("<Select>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get isClearable() {
    		throw new Error("<Select>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set isClearable(value) {
    		throw new Error("<Select>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get isWaiting() {
    		throw new Error("<Select>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set isWaiting(value) {
    		throw new Error("<Select>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get listPlacement() {
    		throw new Error("<Select>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set listPlacement(value) {
    		throw new Error("<Select>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get listOpen() {
    		throw new Error("<Select>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set listOpen(value) {
    		throw new Error("<Select>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get isVirtualList() {
    		throw new Error("<Select>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set isVirtualList(value) {
    		throw new Error("<Select>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get loadOptionsInterval() {
    		throw new Error("<Select>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set loadOptionsInterval(value) {
    		throw new Error("<Select>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get noOptionsMessage() {
    		throw new Error("<Select>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set noOptionsMessage(value) {
    		throw new Error("<Select>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get hideEmptyState() {
    		throw new Error("<Select>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set hideEmptyState(value) {
    		throw new Error("<Select>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get inputAttributes() {
    		throw new Error("<Select>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set inputAttributes(value) {
    		throw new Error("<Select>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get listAutoWidth() {
    		throw new Error("<Select>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set listAutoWidth(value) {
    		throw new Error("<Select>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get itemHeight() {
    		throw new Error("<Select>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set itemHeight(value) {
    		throw new Error("<Select>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get Icon() {
    		throw new Error("<Select>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set Icon(value) {
    		throw new Error("<Select>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get iconProps() {
    		throw new Error("<Select>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set iconProps(value) {
    		throw new Error("<Select>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get showChevron() {
    		throw new Error("<Select>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set showChevron(value) {
    		throw new Error("<Select>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get showIndicator() {
    		throw new Error("<Select>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set showIndicator(value) {
    		throw new Error("<Select>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get containerClasses() {
    		throw new Error("<Select>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set containerClasses(value) {
    		throw new Error("<Select>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get indicatorSvg() {
    		throw new Error("<Select>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set indicatorSvg(value) {
    		throw new Error("<Select>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get listOffset() {
    		throw new Error("<Select>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set listOffset(value) {
    		throw new Error("<Select>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get ClearIcon() {
    		throw new Error("<Select>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set ClearIcon(value) {
    		throw new Error("<Select>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get Item() {
    		throw new Error("<Select>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set Item(value) {
    		throw new Error("<Select>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get List() {
    		throw new Error("<Select>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set List(value) {
    		throw new Error("<Select>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get Selection() {
    		throw new Error("<Select>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set Selection(value) {
    		throw new Error("<Select>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get MultiSelection() {
    		throw new Error("<Select>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set MultiSelection(value) {
    		throw new Error("<Select>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get VirtualList() {
    		throw new Error("<Select>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set VirtualList(value) {
    		throw new Error("<Select>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get selectedValue() {
    		throw new Error("<Select>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set selectedValue(value) {
    		throw new Error("<Select>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get handleClear() {
    		return this.$$.ctx[27];
    	}

    	set handleClear(value) {
    		throw new Error("<Select>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get ariaValues() {
    		throw new Error("<Select>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set ariaValues(value) {
    		throw new Error("<Select>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get ariaListOpen() {
    		throw new Error("<Select>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set ariaListOpen(value) {
    		throw new Error("<Select>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get ariaFocused() {
    		throw new Error("<Select>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set ariaFocused(value) {
    		throw new Error("<Select>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* webviews/components/Todos.svelte generated by Svelte v3.31.0 */

    const { console: console_1$1 } = globals;
    const file$7 = "webviews/components/Todos.svelte";

    function get_each_context$4(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[14] = list[i];
    	child_ctx[15] = list;
    	child_ctx[16] = i;
    	return child_ctx;
    }

    // (192:56) 
    function create_if_block_2$2(ctx) {
    	let t0_value = (/*items*/ ctx[3] = list(/*todo*/ ctx[14].id)) + "";
    	let t0;
    	let t1;
    	let select;
    	let current;

    	select = new Select({
    			props: {
    				id: "food",
    				items: /*items*/ ctx[3],
    				value: /*items*/ ctx[3][2],
    				isClearable: false
    			},
    			$$inline: true
    		});

    	select.$on("select", /*handleSelect*/ ctx[4]);

    	const block = {
    		c: function create() {
    			t0 = text(t0_value);
    			t1 = space();
    			create_component(select.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, t1, anchor);
    			mount_component(select, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if ((!current || dirty & /*todos*/ 4) && t0_value !== (t0_value = (/*items*/ ctx[3] = list(/*todo*/ ctx[14].id)) + "")) set_data_dev(t0, t0_value);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(select.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(select.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(t1);
    			destroy_component(select, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$2.name,
    		type: "if",
    		source: "(192:56) ",
    		ctx
    	});

    	return block;
    }

    // (189:45) 
    function create_if_block_1$2(ctx) {
    	let t0_value = (/*items*/ ctx[3] = list(/*todo*/ ctx[14].id)) + "";
    	let t0;
    	let t1;
    	let select;
    	let current;

    	select = new Select({
    			props: {
    				id: "food",
    				items: /*items*/ ctx[3],
    				value: /*items*/ ctx[3][0],
    				isClearable: false
    			},
    			$$inline: true
    		});

    	select.$on("select", /*handleSelect*/ ctx[4]);

    	const block = {
    		c: function create() {
    			t0 = text(t0_value);
    			t1 = space();
    			create_component(select.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, t1, anchor);
    			mount_component(select, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if ((!current || dirty & /*todos*/ 4) && t0_value !== (t0_value = (/*items*/ ctx[3] = list(/*todo*/ ctx[14].id)) + "")) set_data_dev(t0, t0_value);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(select.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(select.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(t1);
    			destroy_component(select, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$2.name,
    		type: "if",
    		source: "(189:45) ",
    		ctx
    	});

    	return block;
    }

    // (186:13) {#if todo.status === "in progress"}
    function create_if_block$3(ctx) {
    	let t0_value = (/*items*/ ctx[3] = list(/*todo*/ ctx[14].id)) + "";
    	let t0;
    	let t1;
    	let select;
    	let current;

    	select = new Select({
    			props: {
    				items: /*items*/ ctx[3],
    				id: "food",
    				value: /*items*/ ctx[3][1],
    				isClearable: false
    			},
    			$$inline: true
    		});

    	select.$on("select", /*handleSelect*/ ctx[4]);

    	const block = {
    		c: function create() {
    			t0 = text(t0_value);
    			t1 = space();
    			create_component(select.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, t1, anchor);
    			mount_component(select, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if ((!current || dirty & /*todos*/ 4) && t0_value !== (t0_value = (/*items*/ ctx[3] = list(/*todo*/ ctx[14].id)) + "")) set_data_dev(t0, t0_value);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(select.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(select.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(t1);
    			destroy_component(select, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$3.name,
    		type: "if",
    		source: "(186:13) {#if todo.status === \\\"in progress\\\"}",
    		ctx
    	});

    	return block;
    }

    // (160:4) {#each todos as todo (todo.id)}
    function create_each_block$4(key_1, ctx) {
    	let div3;
    	let div0;
    	let h4;
    	let t0_value = /*todo*/ ctx[14].text + "";
    	let t0;
    	let t1;
    	let img;
    	let img_src_value;
    	let t2;
    	let div2;
    	let div1;
    	let current_block_type_index;
    	let if_block;
    	let t3;
    	let current;
    	let mounted;
    	let dispose;

    	function click_handler_1() {
    		return /*click_handler_1*/ ctx[10](/*todo*/ ctx[14], /*each_value*/ ctx[15], /*todo_index*/ ctx[16]);
    	}

    	const if_block_creators = [create_if_block$3, create_if_block_1$2, create_if_block_2$2];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*todo*/ ctx[14].status === "in progress") return 0;
    		if (/*todo*/ ctx[14].status === "open") return 1;
    		if (/*todo*/ ctx[14].status === "build available") return 2;
    		return -1;
    	}

    	if (~(current_block_type_index = select_block_type(ctx))) {
    		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    	}

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			div3 = element("div");
    			div0 = element("div");
    			h4 = element("h4");
    			t0 = text(t0_value);
    			t1 = space();
    			img = element("img");
    			t2 = space();
    			div2 = element("div");
    			div1 = element("div");
    			if (if_block) if_block.c();
    			t3 = space();
    			attr_dev(h4, "class", "svelte-1x3h89u");
    			toggle_class(h4, "complete", /*todo*/ ctx[14].completed);
    			add_location(h4, file$7, 161, 37, 4766);
    			if (img.src !== (img_src_value = "https://api.iconify.design/clarity/window-close-line.svg?color=%23ccc")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "");
    			add_location(img, file$7, 178, 13, 5411);
    			attr_dev(div0, "class", "card_header svelte-1x3h89u");
    			add_location(div0, file$7, 161, 12, 4741);
    			attr_dev(div1, "class", "themed svelte-1x3h89u");
    			add_location(div1, file$7, 184, 12, 5687);
    			attr_dev(div2, "class", "card_body svelte-1x3h89u");
    			add_location(div2, file$7, 183, 8, 5651);
    			attr_dev(div3, "class", "card svelte-1x3h89u");
    			add_location(div3, file$7, 160, 8, 4710);
    			this.first = div3;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div0);
    			append_dev(div0, h4);
    			append_dev(h4, t0);
    			append_dev(h4, t1);
    			append_dev(div0, img);
    			append_dev(div3, t2);
    			append_dev(div3, div2);
    			append_dev(div2, div1);

    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].m(div1, null);
    			}

    			append_dev(div3, t3);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(h4, "click", click_handler_1, false, false, false),
    					listen_dev(img, "click", click_handler_2, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if ((!current || dirty & /*todos*/ 4) && t0_value !== (t0_value = /*todo*/ ctx[14].text + "")) set_data_dev(t0, t0_value);

    			if (dirty & /*todos*/ 4) {
    				toggle_class(h4, "complete", /*todo*/ ctx[14].completed);
    			}

    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if (~current_block_type_index) {
    					if_blocks[current_block_type_index].p(ctx, dirty);
    				}
    			} else {
    				if (if_block) {
    					group_outros();

    					transition_out(if_blocks[previous_block_index], 1, 1, () => {
    						if_blocks[previous_block_index] = null;
    					});

    					check_outros();
    				}

    				if (~current_block_type_index) {
    					if_block = if_blocks[current_block_type_index];

    					if (!if_block) {
    						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    						if_block.c();
    					} else {
    						if_block.p(ctx, dirty);
    					}

    					transition_in(if_block, 1);
    					if_block.m(div1, null);
    				} else {
    					if_block = null;
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);

    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].d();
    			}

    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$4.name,
    		type: "each",
    		source: "(160:4) {#each todos as todo (todo.id)}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$7(ctx) {
    	let div0;
    	let t1;
    	let div1;
    	let form;
    	let input;
    	let t2;
    	let button;
    	let t4;
    	let div2;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let current;
    	let mounted;
    	let dispose;
    	let each_value = /*todos*/ ctx[2];
    	validate_each_argument(each_value);
    	const get_key = ctx => /*todo*/ ctx[14].id;
    	validate_each_keys(ctx, each_value, get_each_context$4, get_key);

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context$4(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block$4(key, child_ctx));
    	}

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			div0.textContent = "Enter Ticket ID:";
    			t1 = space();
    			div1 = element("div");
    			form = element("form");
    			input = element("input");
    			t2 = space();
    			button = element("button");
    			button.textContent = "Submit";
    			t4 = space();
    			div2 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			add_location(div0, file$7, 142, 0, 4297);
    			attr_dev(input, "placeholder", "ticket id");
    			add_location(input, file$7, 149, 4, 4455);
    			attr_dev(form, "class", "svelte-1x3h89u");
    			add_location(form, file$7, 144, 0, 4351);
    			attr_dev(button, "class", "svelte-1x3h89u");
    			add_location(button, file$7, 151, 4, 4519);
    			attr_dev(div1, "class", "flex_center svelte-1x3h89u");
    			add_location(div1, file$7, 143, 0, 4325);
    			attr_dev(div2, "class", "card_container svelte-1x3h89u");
    			add_location(div2, file$7, 158, 0, 4637);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, form);
    			append_dev(form, input);
    			set_input_value(input, /*text*/ ctx[1]);
    			append_dev(div1, t2);
    			append_dev(div1, button);
    			insert_dev(target, t4, anchor);
    			insert_dev(target, div2, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div2, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", /*input_input_handler*/ ctx[7]),
    					listen_dev(form, "submit", prevent_default(/*submit_handler*/ ctx[8]), false, true, false),
    					listen_dev(button, "click", /*click_handler*/ ctx[9], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*text*/ 2 && input.value !== /*text*/ ctx[1]) {
    				set_input_value(input, /*text*/ ctx[1]);
    			}

    			if (dirty & /*items, handleSelect, list, todos, fetch, apiBaseUrl, JSON, accessToken, console*/ 29) {
    				const each_value = /*todos*/ ctx[2];
    				validate_each_argument(each_value);
    				group_outros();
    				validate_each_keys(ctx, each_value, get_each_context$4, get_key);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, div2, outro_and_destroy_block, create_each_block$4, null, get_each_context$4);
    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div1);
    			if (detaching) detach_dev(t4);
    			if (detaching) detach_dev(div2);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}

    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function list(id) {
    	return [
    		{ value: "o", label: "Open", id },
    		{ value: "ip", label: "In Progress", id },
    		{
    			value: "ba",
    			label: "Build Available",
    			id
    		}
    	];
    }

    const click_handler_2 = () => {
    	
    }; //TODO: Complete this function [Delete particular task]

    function instance$7($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Todos", slots, []);

    	var __awaiter = this && this.__awaiter || function (thisArg, _arguments, P, generator) {
    		function adopt(value) {
    			return value instanceof P
    			? value
    			: new P(function (resolve) {
    						resolve(value);
    					});
    		}

    		return new (P || (P = Promise))(function (resolve, reject) {
    				function fulfilled(value) {
    					try {
    						step(generator.next(value));
    					} catch(e) {
    						reject(e);
    					}
    				}

    				function rejected(value) {
    					try {
    						step(generator["throw"](value));
    					} catch(e) {
    						reject(e);
    					}
    				}

    				function step(result) {
    					result.done
    					? resolve(result.value)
    					: adopt(result.value).then(fulfilled, rejected);
    				}

    				step((generator = generator.apply(thisArg, _arguments || [])).next());
    			});
    	};

    	
    	let { user } = $$props;
    	let { accessToken } = $$props;
    	let text = "";
    	let todos = [];

    	let items = [
    		{ value: "o", label: "Open" },
    		{ value: "ip", label: "In Progress" },
    		{ value: "ba", label: "Build Available" }
    	];

    	let status;

    	function handleSelect(event) {
    		return __awaiter(this, void 0, void 0, function* () {
    			console.log("----------in", event.detail);
    			console.log("---token---", localStorage.getItem("clickupId"));

    			const response = yield fetch(`${apiBaseUrl}/todo`, {
    				method: "PUT",
    				body: JSON.stringify({
    					id: event.detail.id,
    					status: event.detail.label,
    					clickupId: localStorage.getItem("clickupId")
    				}),
    				headers: {
    					"content-type": "application/json",
    					authorization: `Bearer ${accessToken}`
    				}
    			});
    		});
    	}

    	function addTodo(t) {
    		return __awaiter(this, void 0, void 0, function* () {
    			console.log("add-todo called");

    			const response = yield fetch(`${apiBaseUrl}/todo`, {
    				method: "POST",
    				body: JSON.stringify({
    					text: t,
    					clickupId: localStorage.getItem("clickupId")
    				}),
    				headers: {
    					"content-type": "application/json",
    					authorization: `Bearer ${accessToken}`
    				}
    			});

    			const { todo } = yield response.json();
    			$$invalidate(2, todos = [todo, ...todos]);
    		});
    	}

    	function updateTodo(id, status) {
    		return __awaiter(this, void 0, void 0, function* () {
    			const response = yield fetch(`${apiBaseUrl}/todo`, {
    				method: "PUT",
    				body: JSON.stringify({
    					id,
    					status,
    					clickupId: localStorage.getItem("clickupId")
    				}),
    				headers: {
    					"content-type": "application/json",
    					authorization: `Bearer ${accessToken}`
    				}
    			});
    		});
    	}

    	onMount(() => __awaiter(void 0, void 0, void 0, function* () {
    		window.addEventListener("message", event => __awaiter(void 0, void 0, void 0, function* () {
    			const message = event.data;

    			switch (message.type) {
    				case "new-todo":
    					addTodo(message.value);
    					break;
    			}
    		}));

    		const response = yield fetch(`${apiBaseUrl}/todo`, {
    			headers: { authorization: `Bearer ${accessToken}` }
    		});

    		const payload = yield response.json();
    		$$invalidate(2, todos = payload.todos);
    		console.log(todos);
    	}));

    	const writable_props = ["user", "accessToken"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1$1.warn(`<Todos> was created with unknown prop '${key}'`);
    	});

    	function input_input_handler() {
    		text = this.value;
    		$$invalidate(1, text);
    	}

    	const submit_handler = async () => {
    		addTodo(text);
    		$$invalidate(1, text = "");
    	};

    	const click_handler = async () => {
    		addTodo(text);
    		$$invalidate(1, text = "");
    	};

    	const click_handler_1 = async (todo, each_value, todo_index) => {
    		$$invalidate(2, each_value[todo_index].completed = !todo.completed, todos);

    		const response = await fetch(`${apiBaseUrl}/todo`, {
    			method: "PUT",
    			body: JSON.stringify({ id: todo.id }),
    			headers: {
    				"content-type": "application/json",
    				authorization: `Bearer ${accessToken}`
    			}
    		});

    		console.log(await response.json());
    	};

    	$$self.$$set = $$props => {
    		if ("user" in $$props) $$invalidate(6, user = $$props.user);
    		if ("accessToken" in $$props) $$invalidate(0, accessToken = $$props.accessToken);
    	};

    	$$self.$capture_state = () => ({
    		__awaiter,
    		onMount,
    		Select,
    		user,
    		accessToken,
    		text,
    		todos,
    		list,
    		items,
    		status,
    		handleSelect,
    		addTodo,
    		updateTodo
    	});

    	$$self.$inject_state = $$props => {
    		if ("__awaiter" in $$props) __awaiter = $$props.__awaiter;
    		if ("user" in $$props) $$invalidate(6, user = $$props.user);
    		if ("accessToken" in $$props) $$invalidate(0, accessToken = $$props.accessToken);
    		if ("text" in $$props) $$invalidate(1, text = $$props.text);
    		if ("todos" in $$props) $$invalidate(2, todos = $$props.todos);
    		if ("items" in $$props) $$invalidate(3, items = $$props.items);
    		if ("status" in $$props) status = $$props.status;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		accessToken,
    		text,
    		todos,
    		items,
    		handleSelect,
    		addTodo,
    		user,
    		input_input_handler,
    		submit_handler,
    		click_handler,
    		click_handler_1
    	];
    }

    class Todos extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, { user: 6, accessToken: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Todos",
    			options,
    			id: create_fragment$7.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*user*/ ctx[6] === undefined && !("user" in props)) {
    			console_1$1.warn("<Todos> was created without expected prop 'user'");
    		}

    		if (/*accessToken*/ ctx[0] === undefined && !("accessToken" in props)) {
    			console_1$1.warn("<Todos> was created without expected prop 'accessToken'");
    		}
    	}

    	get user() {
    		throw new Error("<Todos>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set user(value) {
    		throw new Error("<Todos>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get accessToken() {
    		throw new Error("<Todos>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set accessToken(value) {
    		throw new Error("<Todos>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* webviews/components/Sidebar.svelte generated by Svelte v3.31.0 */

    const { console: console_1$2 } = globals;
    const file$8 = "webviews/components/Sidebar.svelte";

    // (118:0) {:else}
    function create_else_block$2(ctx) {
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = "login with GitHub";
    			add_location(button, file$8, 118, 4, 4005);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler_1*/ ctx[9], false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$2.name,
    		type: "else",
    		source: "(118:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (82:15) 
    function create_if_block_1$3(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block_2$3, create_if_block_3$1];
    	const if_blocks = [];

    	function select_block_type_1(ctx, dirty) {
    		if (/*page*/ ctx[0] === "todos") return 0;
    		if (/*page*/ ctx[0] === "contact") return 1;
    		return -1;
    	}

    	if (~(current_block_type_index = select_block_type_1(ctx))) {
    		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    	}

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].m(target, anchor);
    			}

    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type_1(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if (~current_block_type_index) {
    					if_blocks[current_block_type_index].p(ctx, dirty);
    				}
    			} else {
    				if (if_block) {
    					group_outros();

    					transition_out(if_blocks[previous_block_index], 1, 1, () => {
    						if_blocks[previous_block_index] = null;
    					});

    					check_outros();
    				}

    				if (~current_block_type_index) {
    					if_block = if_blocks[current_block_type_index];

    					if (!if_block) {
    						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    						if_block.c();
    					} else {
    						if_block.p(ctx, dirty);
    					}

    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				} else {
    					if_block = null;
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].d(detaching);
    			}

    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$3.name,
    		type: "if",
    		source: "(82:15) ",
    		ctx
    	});

    	return block;
    }

    // (80:0) {#if loading}
    function create_if_block$4(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			div.textContent = "loading...";
    			add_location(div, file$8, 80, 4, 2904);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$4.name,
    		type: "if",
    		source: "(80:0) {#if loading}",
    		ctx
    	});

    	return block;
    }

    // (86:33) 
    function create_if_block_3$1(ctx) {
    	let div;
    	let t1;
    	let form;
    	let input;
    	let t2;
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			div.textContent = "Please Enter Clickup Token Id:";
    			t1 = space();
    			form = element("form");
    			input = element("input");
    			t2 = space();
    			button = element("button");
    			button.textContent = "Submit";
    			add_location(div, file$8, 86, 8, 3058);
    			add_location(input, file$8, 92, 8, 3251);
    			add_location(form, file$8, 87, 8, 3108);
    			add_location(button, file$8, 94, 8, 3311);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, form, anchor);
    			append_dev(form, input);
    			set_input_value(input, /*clickupToken*/ ctx[1]);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, button, anchor);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", /*input_input_handler*/ ctx[6]),
    					listen_dev(form, "submit", prevent_default(/*submit_handler*/ ctx[7]), false, true, false),
    					listen_dev(button, "click", /*click_handler*/ ctx[8], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*clickupToken*/ 2 && input.value !== /*clickupToken*/ ctx[1]) {
    				set_input_value(input, /*clickupToken*/ ctx[1]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(form);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(button);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3$1.name,
    		type: "if",
    		source: "(86:33) ",
    		ctx
    	});

    	return block;
    }

    // (83:4) {#if page === 'todos'}
    function create_if_block_2$3(ctx) {
    	let todos;
    	let current;

    	todos = new Todos({
    			props: {
    				user: /*user*/ ctx[4],
    				accessToken: /*accessToken*/ ctx[2]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(todos.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(todos, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const todos_changes = {};
    			if (dirty & /*user*/ 16) todos_changes.user = /*user*/ ctx[4];
    			if (dirty & /*accessToken*/ 4) todos_changes.accessToken = /*accessToken*/ ctx[2];
    			todos.$set(todos_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(todos.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(todos.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(todos, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$3.name,
    		type: "if",
    		source: "(83:4) {#if page === 'todos'}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$8(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block$4, create_if_block_1$3, create_else_block$2];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*loading*/ ctx[3]) return 0;
    		if (/*user*/ ctx[4]) return 1;
    		return 2;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$8.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$8($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Sidebar", slots, []);

    	var __awaiter = this && this.__awaiter || function (thisArg, _arguments, P, generator) {
    		function adopt(value) {
    			return value instanceof P
    			? value
    			: new P(function (resolve) {
    						resolve(value);
    					});
    		}

    		return new (P || (P = Promise))(function (resolve, reject) {
    				function fulfilled(value) {
    					try {
    						step(generator.next(value));
    					} catch(e) {
    						reject(e);
    					}
    				}

    				function rejected(value) {
    					try {
    						step(generator["throw"](value));
    					} catch(e) {
    						reject(e);
    					}
    				}

    				function step(result) {
    					result.done
    					? resolve(result.value)
    					: adopt(result.value).then(fulfilled, rejected);
    				}

    				step((generator = generator.apply(thisArg, _arguments || [])).next());
    			});
    	};

    	var _a;
    	let clickupToken = "";
    	
    	let accessToken = "";
    	let loading = true;
    	let user = null;

    	let page = ((_a = tsvscode.getState()) === null || _a === void 0
    	? void 0
    	: _a.page) || "todos";

    	function clickUpTokenSubmit(t) {
    		return __awaiter(this, void 0, void 0, function* () {
    			//     const response = await fetch(`${apiBaseUrl}/clickup`, {
    			//     method: 'PUT',
    			//     body: JSON.stringify({
    			//         clickUpId: t
    			//     }),
    			//     headers: {
    			//         'content-type': 'application/json',
    			//          authorization: `Bearer ${accessToken}`,
    			//     }
    			// });
    			localStorage.setItem("clickupId", t);

    			$$invalidate(0, page = "todos");
    		});
    	}

    	onMount(() => __awaiter(void 0, void 0, void 0, function* () {
    		window.addEventListener("message", event => __awaiter(void 0, void 0, void 0, function* () {
    			const message = event.data;

    			switch (message.type) {
    				case "token":
    					$$invalidate(2, accessToken = message.value);
    					const response = yield fetch(`${apiBaseUrl}/me`, {
    						headers: { authorization: `Bearer ${accessToken}` }
    					});
    					const data = yield response.json();
    					$$invalidate(4, user = data.user);
    					// if (user?.clickUpId != null){
    					if (localStorage.getItem("clickupId")) {
    						console.log("page======", "todo", user === null || user === void 0
    						? void 0
    						: user.clickUpId);

    						$$invalidate(0, page = "todos");
    					} else {
    						console.log("page======", "contact");
    						$$invalidate(0, page = "contact");
    					}
    					$$invalidate(3, loading = false);
    			}
    		}));

    		tsvscode.postMessage({ type: "get-token", value: undefined });
    	}));

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1$2.warn(`<Sidebar> was created with unknown prop '${key}'`);
    	});

    	function input_input_handler() {
    		clickupToken = this.value;
    		$$invalidate(1, clickupToken);
    	}

    	const submit_handler = async () => {
    		clickUpTokenSubmit(clickupToken);
    		$$invalidate(1, clickupToken = "");
    	};

    	const click_handler = async () => {
    		clickUpTokenSubmit(clickupToken);
    		$$invalidate(1, clickupToken = "");
    	};

    	const click_handler_1 = () => {
    		tsvscode.postMessage({ type: "authenticate", value: undefined });
    	};

    	$$self.$capture_state = () => ({
    		__awaiter,
    		_a,
    		clickupToken,
    		onMount,
    		Todos,
    		accessToken,
    		loading,
    		user,
    		page,
    		clickUpTokenSubmit
    	});

    	$$self.$inject_state = $$props => {
    		if ("__awaiter" in $$props) __awaiter = $$props.__awaiter;
    		if ("_a" in $$props) _a = $$props._a;
    		if ("clickupToken" in $$props) $$invalidate(1, clickupToken = $$props.clickupToken);
    		if ("accessToken" in $$props) $$invalidate(2, accessToken = $$props.accessToken);
    		if ("loading" in $$props) $$invalidate(3, loading = $$props.loading);
    		if ("user" in $$props) $$invalidate(4, user = $$props.user);
    		if ("page" in $$props) $$invalidate(0, page = $$props.page);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*page*/ 1) {
    			 {
    				tsvscode.setState({ page });
    			}
    		}
    	};

    	return [
    		page,
    		clickupToken,
    		accessToken,
    		loading,
    		user,
    		clickUpTokenSubmit,
    		input_input_handler,
    		submit_handler,
    		click_handler,
    		click_handler_1
    	];
    }

    class Sidebar extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$8, create_fragment$8, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Sidebar",
    			options,
    			id: create_fragment$8.name
    		});
    	}
    }

    const app = new Sidebar({
        target: document.body,
    });

    return app;

}());
//# sourceMappingURL=sidebar.js.map
