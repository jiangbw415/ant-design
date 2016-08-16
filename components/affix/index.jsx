import React from 'react';
import ReactDOM from 'react-dom';
import addEventListener from 'rc-util/lib/Dom/addEventListener';
import classNames from 'classnames';
import warning from 'warning';
import shallowequal from 'shallowequal';

function getScroll(target, top) {
  const prop = top ? 'pageYOffset' : 'pageXOffset';
  const method = top ? 'scrollTop' : 'scrollLeft';
  const isWindow = target === window;

  let ret = isWindow ? target[prop] : target[method];
  // ie6,7,8 standard mode
  if (isWindow && typeof ret !== 'number') {
    ret = window.document.documentElement[method];
  }

  return ret;
}

function getTargetRect(target) {
  return target !== window ?
    target.getBoundingClientRect() :
    { top: 0, left: 0, bottom: 0 };
}

function getOffset(element, target) {
  const elemRect = element.getBoundingClientRect();
  const targetRect = getTargetRect(target);

  const scrollTop = getScroll(target, true);
  const scrollLeft = getScroll(target, false);

  const docElem = window.document.body;
  const clientTop = docElem.clientTop || 0;
  const clientLeft = docElem.clientLeft || 0;

  return {
    top: elemRect.top - targetRect.top +
      scrollTop - clientTop,
    left: elemRect.left - targetRect.left +
      scrollLeft - clientLeft,
  };
}

export default class Affix extends React.Component {
  static propTypes = {
    offsetTop: React.PropTypes.number,
    offsetBottom: React.PropTypes.number,
    target: React.PropTypes.string,
  }

  static defaultProps = {
    onChange() {},
  }

  constructor(props) {
    super(props);
    this.state = {
      affixStyle: null,
      placeholderStyle: null,
    };
  }

  setAffixStyle(affixStyle) {
    const originalAffixStyle = this.state.affixStyle;
    if (shallowequal(affixStyle, originalAffixStyle)) {
      return;
    }
    this.setState({ affixStyle }, () => {
      const affixed = !!this.state.affixStyle;
      if ((affixStyle && !originalAffixStyle) ||
          (!affixStyle && originalAffixStyle)) {
        this.props.onChange(affixed);
      }
    });
  }

  setPlaceholderStyle(placeholderStyle) {
    const originalPlaceholderStyle = this.state.placeholderStyle;
    if (shallowequal(placeholderStyle, originalPlaceholderStyle)) {
      return;
    }
    this.setState({ placeholderStyle });
  }

  updatePosition = () => {
    let { offsetTop, offsetBottom, offset, target } = this.props;
    target = target ? document.getElementById(target) : window;

    // Backwards support
    offsetTop = offsetTop || offset;
    const scrollTop = getScroll(target, true);
    const elemOffset = getOffset(ReactDOM.findDOMNode(this), target);
    const elemSize = {
      width: this.refs.fixedNode.offsetWidth,
      height: this.refs.fixedNode.offsetHeight,
    };

    const offsetMode = {};
    // Default to `offsetTop=0`.
    if (typeof offsetTop !== 'number' && typeof offsetBottom !== 'number') {
      offsetMode.top = true;
      offsetTop = 0;
    } else {
      offsetMode.top = typeof offsetTop === 'number';
      offsetMode.bottom = typeof offsetBottom === 'number';
    }

    const targetRect = getTargetRect(target);
    const targetInnerHeight = target.innerHeight || target.clientHeight;
    if (scrollTop > elemOffset.top - offsetTop && offsetMode.top) {
      // Fixed Top
      this.setAffixStyle({
        position: 'fixed',
        top: targetRect.top + offsetTop,
        left: targetRect.left + elemOffset.left,
        width: ReactDOM.findDOMNode(this).offsetWidth,
      });
      this.setPlaceholderStyle({
        width: ReactDOM.findDOMNode(this).offsetWidth,
        height: ReactDOM.findDOMNode(this).offsetHeight,
      });
    } else if (
      scrollTop < elemOffset.top + elemSize.height + offsetBottom - targetInnerHeight &&
        offsetMode.bottom
    ) {
      // Fixed Bottom
      const targetBottomOffet = target === window ? 0 : (window.innerHeight - targetRect.bottom);
      this.setAffixStyle({
        position: 'fixed',
        bottom: targetBottomOffet + offsetBottom,
        left: targetRect.left + elemOffset.left,
        width: ReactDOM.findDOMNode(this).offsetWidth,
      });
      this.setPlaceholderStyle({
        width: ReactDOM.findDOMNode(this).offsetWidth,
        height: ReactDOM.findDOMNode(this).offsetHeight,
      });
    } else {
      this.setAffixStyle(null);
      this.setPlaceholderStyle(null);
    }
  }

  componentDidMount() {
    warning(!('offset' in this.props), '`offset` prop of Affix is deprecated, use `offsetTop` instead.');

    const target = this.props.target;
    this.setTargetEventListeners(target);
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.target !== nextProps.target) {
      this.clearScrollEventListeners();
      this.setTargetEventListeners(nextProps.target);

      // Mock Event object.
      this.updatePosition();
    }
  }

  componentWillUnmount() {
    this.clearScrollEventListeners();
  }

  setTargetEventListeners(targetId) {
    const target = !targetId ? window : document.getElementById(targetId);
    this.scrollEvent = addEventListener(target, 'scroll', this.updatePosition);
    this.resizeEvent = addEventListener(target, 'resize', this.updatePosition);
    if (target !== window) {
      this.windowScrollEvent = addEventListener(window, 'scroll', this.updatePosition);
      this.windowResizeEvent = addEventListener(window, 'resize', this.updatePosition);
    }
  }

  clearScrollEventListeners() {
    ['scrollEvent', 'resizeEvent', 'windowScrollEvent', 'windowResizeEvent'].forEach((name) => {
      if (this[name]) {
        this[name].remove();
      }
    });
  }

  render() {
    const className = classNames({
      'ant-affix': this.state.affixStyle,
    });

    const props = { ...this.props };
    delete props.offsetTop;
    delete props.offsetBottom;
    delete props.target;

    return (
      <div {...props} style={this.state.placeholderStyle}>
        <div className={className} ref="fixedNode" style={this.state.affixStyle}>
          {this.props.children}
        </div>
      </div>
    );
  }
}
