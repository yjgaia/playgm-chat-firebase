RUN(() => {
	
	let connectionsRef = firebase.database().ref('connections');
	let chatsRef = firebase.database().ref('chats');
	let iconsRef = firebase.storage().ref('icons');
	let uploadsRef = firebase.storage().ref('uploads');
	
	let user;
	let userIconURLs = {};
	
	let startService = () => {
		
		let chatSnapshots = [];
		let iconMap = {};
		
		let loading = IMG({
			style : {
				position : 'fixed',
				left : 5,
				bottom : 40
			},
			src : 'resource/loading.gif'
		}).appendTo(BODY);
		
		// 채팅 목록
		let messageList = DIV({
			style : {
				paddingTop : 10,
				overflowY : 'scroll',
				onDisplayResize : (width, height) => {
					return {
						height : height - 50
					};
				}
			}
		}).appendTo(BODY);
		
		// 새 메시지가 추가되면
		chatsRef.on('child_added', (snapshot) => {
			loading.remove();
			
			let isToScrollBottom = messageList.getScrollTop() >= messageList.getScrollHeight() - messageList.getHeight() - 10;
			
			let chatData = snapshot.val();
			
			chatSnapshots.push({
				key : snapshot.key,
				data : chatData
			});
			
			// 카페 새 글 알림
			if (chatData.isNewCafeArticle === true) {
				messageList.append(DIV({
					style : {
						padding : '0 8px',
						paddingBottom : 8,
						color : '#080',
						fontWeight : 'bold'
					},
					c : ['새 글 알림! ', A({
						style : {
							textDecoration : 'underline'
						},
						target : '_blank',
						href : 'http://cafe.naver.com/playgm/' + chatData.articleId,
						c : chatData.title + ', by ' + chatData.nickname
					})]
				}));
			}
			
			// 새 메시지
			else {
				
				let icon;
				messageList.append(DIV({
					style : {
						padding : '0 8px',
						paddingBottom : 8
					},
					c : [icon = IMG({
						style : {
							marginBottom : -5,
							marginRight : 5,
							width : 20,
							height : 20,
							borderRadius : 20
						},
						src : userIconURLs[chatData.userId] === undefined ? 'resource/default-icon.png' : userIconURLs[chatData.userId]
					}), SPAN({
						style : {
							fontWeight : 'bolder',
							marginRight : 6
						},
						c : chatData.name
					}), SPAN({
						style : {
							fontSize : 0
						},
						c : ' : '
					}), chatData.downloadURL !== undefined ? A({
						style : {
							fontWeight : 'bolder',
							textDecoration : 'underline'
						},
						c : chatData.fileName !== undefined ? chatData.fileName : chatData.downloadURL,
						target : '_blank',
						href : chatData.downloadURL
					}) : chatData.message]
				}));
				
				if (iconMap[chatData.userId] === undefined) {
					iconMap[chatData.userId] = [];
				}
				iconMap[chatData.userId].push(icon);
				
				iconsRef.child(chatData.userId).getDownloadURL().then((url) => {
					userIconURLs[chatData.userId] = url;
					
					EACH(iconMap[chatData.userId], (icon) => {
						icon.setSrc(url);
					});
					
				}).catch(() => {
					// ignore.
				});
			}
			
			// 마지막 메시지를 보고있거나 자기가 쓴 글이라면 스크롤 맨 아래로
			if (isToScrollBottom === true || chatData.userId === user.uid) {
				messageList.scrollTo({
					top : 999999
				});
			}
			
			// 오래된 메시지 삭제
			if (chatSnapshots.length > 100) {
				
				REPEAT(chatSnapshots.length - 100, () => {
					
					let fileId = chatSnapshots[0].data.fileId;
					
					// 파일 업로드인 경우 업로드 파일도 삭제합니다.
					if (fileId !== undefined) {
						uploadsRef.child(fileId).delete();
					}
					
					chatsRef.child(chatSnapshots[0].key).remove();
					chatSnapshots.shift();
				});
			}
		});
		
		// 화면 크기가 바뀌면 스크롤 맨 아래로
		EVENT('resize', () => {
			messageList.scrollTo({
				top : 999999
			});
		});
		
		// 메시지 입력칸
		let fileInput;
		let uploadButton;
		FORM({
			style : {
				position : 'fixed',
				bottom : 0,
				width : '100%',
				boxShadow : '0 0 0.4em rgba(0, 0, 0, 0.15)'
			},
			c : [
			UUI.FULL_INPUT({
				style : {
					padding : 10
				},
				name : 'message',
				placeholder : '메시지를 입력하세요.',
				isOffAutocomplete : true
			}),
			
			// 설정 버튼
			A({
				style : {
					position : 'fixed',
					right : 50,
					bottom : 0,
					padding : 8,
					color : '#ccc',
					fontSize : 16
				},
				c : FontAwesome.GetIcon('cog'),
				on : {
					mouseover : (e, button) => {
						button.addStyle({
							color : '#999'
						});
					},
					mouseout : (e, button) => {
						button.addStyle({
							color : '#ccc'
						});
					},
					tap : () => {
						
						// 설정 창 띄우기
						let fileInput;
						let iconPreview;
						let description;
						let settingPanel = UUI.V_CENTER({
							style : {
								position : 'fixed',
								left : 0,
								top : 0,
								width : '100%',
								height : '100%',
								backgroundColor : 'rgba(255, 255, 255, 0.75)'
							},
							c : [UUI.V_CENTER({
								style : {
									position : 'relative',
									backgroundColor : '#fff',
									width : 240,
									height : 150,
									borderRadius : 20,
									boxShadow : '0 0 2em rgba(0, 0, 0, 0.2)',
									margin : 'auto',
									textAlign : 'center'
								},
								c : [H3({
									style : {
										position : 'absolute',
										left : 20,
										top : 20,
										fontWeight : 'bolder'
									},
									c : '아이콘'
								}), fileInput = INPUT({
									style : {
										position : 'fixed',
										left : -999999,
										top : -999999
									},
									type : 'file',
									on : {
										change : () => {
											let file = fileInput.getEl().files[0];
											
											if (file.size !== undefined && file.size <= 4096) {
												
												description.empty();
												description.append('업로드 중...');
												
												iconsRef.child(user.uid).put(file).then((snapshot) => {
													iconsRef.child(user.uid).getDownloadURL().then((url) => {
														
														iconPreview.setSrc(url);
														
														description.empty();
														description.append('PNG, 4KB 이하');
													});
												});
											}
											
											else {
												alert('파일 용량이 초과하였습니다.');
											}
										}
									}
								}), A({
									c : iconPreview = IMG({
										style : {
											width : 20,
											height : 20,
											borderRadius : 20
										},
										src : userIconURLs[user.uid] === undefined ? 'resource/default-icon.png' : userIconURLs[user.uid]
									}),
									on : {
										tap : () => {
											fileInput.select();
										}
									}
								}), description = P({
									style : {
										marginTop : 5
									},
									c : 'PNG, 4KB 이하'
								}), A({
									style : {
										position : 'absolute',
										right : 20,
										bottom : 20,
										fontWeight : 'bolder',
										textDecoration : 'underline'
									},
									c : '닫기',
									on : {
										tap : () => {
											settingPanel.remove();
										}
									}
								})]
							})]
						}).appendTo(BODY);
					}
				}
			}),
			
			fileInput = INPUT({
				style : {
					position : 'fixed',
					left : -999999,
					top : -999999
				},
				type : 'file',
				on : {
					change : () => {
						let file = fileInput.getEl().files[0];
						
						if (file.size !== undefined && file.size <= 20971520) {
							
							let fileId = UUID();
							
							let uploadTask = uploadsRef.child(fileId).put(file);
							
							uploadTask.on('state_changed', (snapshot) => {
								uploadButton.empty();
								uploadButton.append(INTEGER((snapshot.bytesTransferred / snapshot.totalBytes) * 100));
							}, () => {
								uploadButton.empty();
								uploadButton.append(FontAwesome.GetIcon('upload'));
							}, () => {
								uploadButton.empty();
								uploadButton.append(FontAwesome.GetIcon('upload'));
								
								uploadTask.snapshot.ref.getDownloadURL().then((downloadURL) => {
									chatsRef.push({
										userId : user.uid,
										name : user.displayName,
										fileId : fileId,
										fileName : file.name,
										downloadURL : downloadURL
									});
								});
							});
						}
						
						else {
							alert('제한 크기를 초과한 파일입니다.');
						}
					}
				}
			}),
			
			// 업로드 버튼
			uploadButton = A({
				style : {
					position : 'fixed',
					right : 10,
					bottom : 0,
					padding : 8,
					color : '#ccc',
					fontSize : 16
				},
				c : FontAwesome.GetIcon('upload'),
				on : {
					mouseover : (e, button) => {
						button.addStyle({
							color : '#999'
						});
					},
					mouseout : (e, button) => {
						button.addStyle({
							color : '#ccc'
						});
					},
					tap : () => {
						fileInput.select();
					}
				}
			})
			],
			on : {
				submit : (e, form) => {
					
					let message = form.getData().message.trim();
					form.setData({});
					
					if (message !== '') {
						chatsRef.push({
							userId : user.uid,
							name : user.displayName,
							message : message
						});
					}
				}
			}
		}).appendTo(BODY);
		
		// 1분에 한번씩 커넥션을 유지합니다.
		INTERVAL(60, RAR(() => {
			connectionsRef.child(user.uid).set({
				name : user.displayName,
				time : firebase.database.ServerValue.TIMESTAMP
			});
		}));
		
		// 최근 유저를 가져옵니다.
		connectionsRef.once('value', (snapshot) => {
			
			let connections = [];
			snapshot.forEach((childSnapshot) => {
				connections.push(childSnapshot.val());
			});
			
			let lastTime = 0;
			connections.forEach((connection) => {
				if (connection.time > lastTime) {
					lastTime = connection.time;
				}
			});
			
			let names = '';
			let recentConnections = [];
			connections.forEach((connection) => {
				// 마지막 접속자와 비교하여 2분 미만 내에 커넥션을 유지한 사용자만
				if (lastTime - connection.time < 2 * 60 * 1000) {
					recentConnections.push(connection);
					
					if (names !== '') {
						names += ', ';
					}
					names += connection.name;
				}
			});
			
			messageList.append(DIV({
				style : {
					padding : '0 8px',
					paddingBottom : 8,
					color : '#080',
					fontWeight : 'bold'
				},
				c : '최근 유저(' + recentConnections.length + '명) : ' + names
			}));
			
			messageList.scrollTo({
				top : 999999
			});
		});
	};
	
	// 로그인 체크
	firebase.auth().onAuthStateChanged((_user) => {
		
		// 로그인 화면
		if (_user === TO_DELETE) {
			
			let authContainer = DIV({
				style : {
					marginTop : 20
				}
			}).appendTo(BODY);
			
			// 인증 처리
			new firebaseui.auth.AuthUI(firebase.auth()).start(authContainer.getEl(), {
				signInOptions : [
					firebase.auth.EmailAuthProvider.PROVIDER_ID
				],
				callbacks : {
					signInSuccessWithAuthResult : (authResult) => {
						authContainer.remove();
						
						if (user === undefined) {
							user = authResult.user;
							startService();
						}
						
						return false;
					}
				}
			});
		}
		
		else if (user === undefined) {
			user = _user;
			startService();
		}
	});
});
