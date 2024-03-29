import React from "react";
import { ContextMenu } from "../components/ContextMenu";
import Globals from "../Globals";

/*- Components -*/
export class Note extends React.PureComponent {
	constructor(props) {
		super(props);

		/*- Changeable -*/
		this.state = {
			dragging: false,
			pos: {
				x: this.props.data.position.x,
				y: this.props.data.position.y,
			},
			size: {
				width: this.props.data.size.width,
				height: this.props.data.size.height,
			},
			focused: false,

			contextMenu: {
				actions: [],
				active: false
			},

			/*- Data -*/
			value: "",
			replacedContent: "",
		};
		this.data = this.props.data;

		/*- Refs -*/
		this.drag = React.createRef();
		this.note = React.createRef();
		this.body = React.createRef();

		/*- Statics -*/
		this.onDelete = this.props.onDelete;

		/*- Bindings -*/
		this.addList = this.addList.bind(this);
	}

	/*- Methods -*/
	componentDidMount() {
		/*- Set scale -*/
		this.body.current.style.width = this.data.size.width + "px";
		this.body.current.style.height = this.data.size.height + "px";

		/*- Fetch data -*/
		const decoder = new TextDecoder();
		fetch(Globals.BACKEND_URL + "notes/" + this.props.id + "-" + this.data.id).then(res => res.text()).then(data => {
			let content = decoder.decode(new Uint8Array(JSON.parse(data)));

			this.onChange(content, false, false);
		});

		this.drag.current.addEventListener("mousedown", () => {
			this.dragStart();
		});
		document.addEventListener("mouseup", this.dragEnd);
		document.addEventListener("mousemove", this.dragMove);
		document.addEventListener("mousedown", (e) => {
			const CLICKABLE = ["context-menu-item", "context-menu-item noborder", "contextmenu", "icon", "context-button"];

			/*- Remove contextmenu if not click on it -*/
			if (!CLICKABLE.includes(e.target.className.split(" ")[0])) {
				this.setState({ contextMenu: { active: false } });
			}
		});
	}
	componentWillUnmount() {
		this.drag.current.removeEventListener("mousedown", this.dragStart);
		window.removeEventListener("mouseup", this.dragEnd);
		window.removeEventListener("mousemove", this.dragMove);
	}

	/*- Convert bytes into real text strings -*/
	convertToRealContent = (content) => {
		let items = {};
		const keys = Object.keys(content);
		const decoder = new TextDecoder();

		keys.forEach(key => {
			let array = content[key]._real_content; // Array([])

			items[key] = {
				...content[key],
				content: decoder.decode(new Uint8Array(array)),
			};
		});

		return items;
	};

	/*- Event Handlers -*/
	dragStart = (_) => {
		if (!this.note.current) return;
		this.setState({ dragging: true });
	
		// Add border to show that it's being dragged
		this.note.current.style.outline = "3px solid rgb(97, 195, 84)";
	};
	dragEnd = (_) => {
		if (!this.note.current) return;
		this.setState({ dragging: false });
		this.onChange(false, this.state.pos, false);

		// Remove border
		this.note.current.style.outline = "none";
	};
	dragMove = (e) => {
		if (this.state.dragging) {
			this.setState({
				pos: {
					x: Math.round((e.clientX - this.note.current.offsetWidth / 2) / this.props.gridSnap) * this.props.gridSnap,

					// Minus half the height of the note to center it - margin
					y: Math.round((e.clientY - this.note.current.offsetHeight / 2 + this.note.current.offsetHeight / 2 - 20) / this.props.gridSnap) * this.props.gridSnap,
				}
			});
		}
	};

	/*- Show context menu -*/
	showContextMenu = (e) => {
		let { clientX, clientY } = e;

		/*- E will be null sometimes because contextmenu can be
			triggered from pressing the second action button -*/
		if (e != null) e.preventDefault();
		else {}
		
		/*- Show context menu -*/
		this.setState({
			contextMenu: {
				active: true,
				x: clientX,
				y: clientY,
				actions: [
					{ name: "Add list", action: this.addList, icon: "edit" },
					{ separator: true },
					{ name: "Delete", action: this.onDelete, icon: "delete", tintColor: "red" },
					{ name: "Clear", action: this.clear, icon: "document-clear", tintColor: "red" },
				],
			}
		});
	};
	clear = () => {
		this.props.data.content = "";
		this.setState({ value: this.props.data.content, contextMenu: { active: false } });
		this.onChange("", false, false);
	};

	/*- Context menu actions -*/
	addList() {
		/*- Check if backslash n is last -*/
		if (this.props.data.content.endsWith("\n") || this.props.data.content.length === 0) {
			/*- Add " • " to textarea body -*/
			this.onChange(this.props.data.content + "• ", false, false);
		} else {
			this.onChange(this.props.data.content + "\n• ", false, false);
		}
		this.setState({ value: this.props.data.content, contextMenu: { active: false } });

		/*- Focus textarea -*/
		this.body.current.focus();
	}

	/*- On change -*/
	onChange = (content, position, size) => {
		this.props.onChange(content, position, size);
	};

	/*- Render -*/
	render() {
		return (
			<div
				key={this.props.index}
				className="item"
				ref={this.note}
				style={{
					left: this.state.pos.x,
					top: this.state.pos.y
				}}
				onContextMenu={this.showContextMenu}
			>

				{/*- Context menu -*/}
				{
					this.state.contextMenu.active && 
					<ContextMenu actions={this.state.contextMenu.actions} />
				}
				<header>
					<div className="actions">
						<button className="_1" onClick={this.props.onDelete}></button>
						<button className="_2" onClick={this.showContextMenu}></button>
						<button className="_3"></button>
					</div>
					<div className="stack" ref={this.drag}>
						<div></div>
						<div></div>
						<div></div>
					</div>
				</header>
				<textarea
					autoFocus
					ref={this.body}
					className="note-body"
					placeholder="Write something..."
					onFocus={() => this.setState({ focused: true })}
					onBlur={() => this.setState({ focused: false })}
					spellCheck={this.state.focused}
					value={this.props.data.content}

					/*- We need size because textarea will be resized depending on the content -*/
					onChange={(e) => {
						this.onChange(e.target.value, false, false);
						
						/*- Set size -*/
						this.setState({ size: { width: e.target.offsetWidth, height: e.target.offsetHeight } }, () => {
							this.onChange(false, false, this.state.size);
						});
					}}
					onMouseUp={(e) => {
						/*- Set size -*/
						this.setState({ size: { width: e.target.offsetWidth, height: e.target.offsetHeight } }, () => {
							this.onChange(false, false, this.state.size);
						});
					}}
				/>
			</div>
		);
	}
}
