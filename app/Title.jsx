import React from 'react';

class Title extends React.Component {
	render() {
		const { text } = this.props;

		return (
			<h2 className="red">{text}</h2>
		)
	}
}

export default Title;