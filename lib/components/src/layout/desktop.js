import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { localStorage, window } from 'global';

import styled from 'react-emotion';
import throttle from 'lodash.throttle';

import SplitPane from 'react-split-pane';

import USplit from './usplit';
import Dimensions from './dimensions';

const StoriesPanelWrapper = styled('div')(({ showStoriesPanel, storiesPanelOnTop }) => ({
  width: '100%',
  height: '100%',
  display: showStoriesPanel ? 'flex' : 'none',
  flexDirection: storiesPanelOnTop ? 'column' : 'row',
  alignItems: 'stretch',
  paddingRight: storiesPanelOnTop ? 10 : 0,
}));

const StoriesPanelInner = styled('div')({
  flexGrow: 1,
  position: 'relative',
  height: '100%',
  width: '100%',
  overflow: 'auto',
});

const AddonPanelWrapper = styled('div')(
  ({ showAddonPanel, addonPanelInRight, theme: { layoutMargin } }) => ({
    display: showAddonPanel ? 'flex' : 'none',
    flexDirection: addonPanelInRight ? 'row' : 'column',
    alignItems: 'stretch',
    position: 'absolute',
    width: '100%',
    height: '100%',
    padding: addonPanelInRight
      ? `${layoutMargin} ${layoutMargin} ${layoutMargin} 0`
      : `0px ${layoutMargin} ${layoutMargin} 0`,
    boxSizing: 'border-box',
  })
);

const resizerCursor = isVert => (isVert ? 'col-resize' : 'row-resize');

const storiesResizerStyle = (showStoriesPanel, storiesPanelOnTop) => ({
  cursor: showStoriesPanel ? resizerCursor(!storiesPanelOnTop) : undefined,
  height: storiesPanelOnTop ? 10 : 'auto',
  width: storiesPanelOnTop ? '100%' : 10,
  zIndex: 1,
});

const addonResizerStyle = (showAddonPanel, addonPanelInRight) => ({
  cursor: showAddonPanel ? resizerCursor(addonPanelInRight) : undefined,
  height: addonPanelInRight ? '100%' : 10,
  width: addonPanelInRight ? 10 : '100%',
  zIndex: 1,
});

const ContentPanel = styled('div')(
  ({ addonPanelInRight, storiesPanelOnTop, theme: { layoutMargin } }) => ({
    position: 'absolute',
    boxSizing: 'border-box',
    width: '100%',
    height: '100%',
    padding: addonPanelInRight
      ? `${layoutMargin} 0 ${layoutMargin} 0`
      : `${layoutMargin} ${layoutMargin} 0 0`,
    paddingTop: storiesPanelOnTop ? 0 : layoutMargin,
  })
);

const PreviewWrapper = styled('div')(
  ({ theme }) => ({
    width: '100%',
    height: '100%',
    boxSizing: 'border-box',
    overflow: 'auto',
    WebkitOverflowScrolling: 'touch',
    position: 'relative',
    backgroundColor: theme.mainFill,
  }),
  ({ fullscreen, theme }) =>
    fullscreen
      ? {
          position: 'fixed',
          left: 0,
          right: 0,
          top: 0,
          zIndex: 1,
          border: 0,
          margin: 0,
          padding: 0,
        }
      : {
          border: theme.mainBorder,
          borderRadius: theme.mainBorderRadius,

          display: 'flex',
          justifyItems: 'center',
          alignItems: 'center',
          '& > *': {
            margin: 'auto',
          },
        }
);

const DragBlockOverlay = styled('div')(({ isDragging }) => ({
  display: isDragging ? 'block' : 'none',
  position: 'absolute',
  top: '0px',
  right: '0px',
  bottom: '0px',
  left: '0px',
}));

const defaultSizes = {
  addonPanel: {
    down: 200,
    right: 400,
  },
  storiesPanel: {
    left: 250,
    top: 400,
  },
};

const saveSizes = sizes => {
  try {
    localStorage.setItem('panelSizes', JSON.stringify(sizes));
    return true;
  } catch (e) {
    return false;
  }
};

const getSavedSizes = sizes => {
  try {
    const panelSizes = localStorage.getItem('panelSizes');
    if (panelSizes) {
      return JSON.parse(panelSizes);
    }
    saveSizes(sizes);
    return sizes;
  } catch (e) {
    saveSizes(sizes);
    return sizes;
  }
};

class Layout extends Component {
  constructor(props) {
    super(props);

    this.layerSizes = getSavedSizes(defaultSizes);

    this.state = {
      previewPanelDimensions: {
        height: 0,
        width: 0,
      },
      isDragging: false,
    };

    this.throttledUpdatePreviewPanelState = throttle(this.updatePrevewPanelState.bind(this), 200);
    this.throttledSaveSizes = throttle(this.saveSizes, 25);
    this.onDragStart = this.onDragStart.bind(this);
    this.onDragEnd = this.onDragEnd.bind(this);
  }

  componentDidMount() {
    window.addEventListener('resize', this.throttledUpdatePreviewPanelState);
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.throttledUpdatePreviewPanelState);
  }

  onDragStart() {
    this.setState({ isDragging: true });
  }

  onDragEnd() {
    this.setState({ isDragging: false });
  }

  onResize(pane, mode, size) {
    this.throttledSaveSizes(pane, mode, size);
    this.throttledUpdatePreviewPanelState();
  }

  saveSizes(pane, mode, size) {
    this.layerSizes[pane][mode] = size;
    saveSizes(this.layerSizes);
  }

  updatePrevewPanelState() {
    const { clientWidth, clientHeight } = this.previewPanelRef;

    this.setState({
      previewPanelDimensions: {
        width: clientWidth,
        height: clientHeight,
      },
    });
  }

  render() {
    const {
      goFullScreen,
      showStoriesPanel,
      showAddonPanel,
      addonPanelInRight,
      addonPanel: AddonPanel,
      storiesPanel: StoriesPanel,
      preview: Preview,
    } = this.props;

    const { previewPanelDimensions } = this.state;
    const storiesPanelOnTop = false;
    const addonSplit = addonPanelInRight ? 'vertical' : 'horizontal';
    const storiesSplit = storiesPanelOnTop ? 'horizontal' : 'vertical';

    const sizes = getSavedSizes(this.layerSizes);
    const storiesPanelDefaultSize = !storiesPanelOnTop
      ? sizes.storiesPanel.left
      : sizes.storiesPanel.top;
    const addonPanelDefaultSize = !addonPanelInRight
      ? sizes.addonPanel.down
      : sizes.addonPanel.right;

    return (
      <SplitPane
        split={storiesSplit}
        allowResize={showStoriesPanel}
        minSize={1}
        maxSize={-400}
        size={showStoriesPanel ? storiesPanelDefaultSize : 1}
        defaultSize={storiesPanelDefaultSize}
        resizerStyle={storiesResizerStyle(showStoriesPanel, storiesPanelOnTop)}
        onDragStarted={this.onDragStart}
        onDragFinished={this.onDragEnd}
        onChange={size => this.onResize('storiesPanel', storiesPanelOnTop ? 'top' : 'left', size)}
      >
        <StoriesPanelWrapper {...{ showStoriesPanel, storiesPanelOnTop }}>
          <StoriesPanelInner>
            <StoriesPanel />
          </StoriesPanelInner>
          <USplit shift={5} split={storiesSplit} />
        </StoriesPanelWrapper>
        <SplitPane
          split={addonSplit}
          allowResize={showAddonPanel}
          primary="second"
          minSize={addonPanelInRight ? 200 : 100}
          maxSize={-200}
          size={showAddonPanel ? addonPanelDefaultSize : 1}
          defaultSize={addonPanelDefaultSize}
          resizerStyle={addonResizerStyle(showAddonPanel, addonPanelInRight)}
          onDragStarted={this.onDragStart}
          onDragFinished={this.onDragEnd}
          onChange={size => this.onResize('addonPanel', addonPanelInRight ? 'right' : 'down', size)}
        >
          <ContentPanel {...{ addonPanelInRight, storiesPanelOnTop }}>
            {/*
              When resizing panels, the drag event breaks if the cursor
              moves over the iframe. Show an overlay div over iframe
              at drag start and hide it when the drag ends.
            */}
            <DragBlockOverlay isDragging={this.state.isDragging} />
            <PreviewWrapper
              fullscreen={goFullScreen}
              innerRef={ref => {
                this.previewPanelRef = ref;
              }}
            >
              <Preview />
            </PreviewWrapper>
            <Dimensions {...previewPanelDimensions} />
          </ContentPanel>
          <AddonPanelWrapper {...{ showAddonPanel, addonPanelInRight }}>
            <USplit shift={-5} split={addonSplit} />
            <AddonPanel />
          </AddonPanelWrapper>
        </SplitPane>
      </SplitPane>
    );
  }
}

Layout.propTypes = {
  showStoriesPanel: PropTypes.bool.isRequired,
  showAddonPanel: PropTypes.bool.isRequired,
  goFullScreen: PropTypes.bool.isRequired,
  storiesPanel: PropTypes.func.isRequired,
  preview: PropTypes.func.isRequired,
  addonPanel: PropTypes.func.isRequired,
  addonPanelInRight: PropTypes.bool.isRequired,
};

export default Layout;
