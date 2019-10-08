import React from "react";

export default class InitComponent extends React.Component {
  componentDidMount = () => {
		if(this.props.rootChainContract) {
			this.init()
		}
	}

	componentDidUpdate = (prevProps) => {
		const { rootChainContract } = this.props;
		if (!prevProps.rootChainContract && rootChainContract) {
			this.init()
		}
  }

  init = () => {}

}