import { useColorScheme, Modal, ScrollView, TextInput, StyleSheet, Pressable, Button, Image, FlatList, Text, View, Alert} from 'react-native';
import { useTheme} from '@react-navigation/native';
import {ToastAndroid} from 'react-native';
import MFM from './MFM';

import AntDesign from '@expo/vector-icons/AntDesign';
import { useAPI, useAPIPaginator } from './api';
import { useContext, useState, useEffect } from 'react';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as Notifications from 'expo-notifications';
import { AccountContext} from './Account';



export function useDrive() {
    const api = useAPI();
    const account = useContext(AccountContext);
    const files = useAPIPaginator("drive/files", {});
    const [usage, setUsage] = useState({});
    useEffect( () => {
        api.call("drive", {
        }).then(
            (json) => {
                setUsage(json);
        }).catch(
            (e) => {
                console.log(e);
                Alert.alert('Could not load drive', 'You may need to logout and log back in to ensure you have sufficient permissions.');
            }
        );
    }, [account.lastUpload]);
    return {
        usage: usage,
        files: files.data,
        moreAfter: files.moreAfter,
        moreBefore: files.moreBefore,
        refresh: files.refresh,
    };
}

function humanFriendly(num) {
    if (num >= (1024*1024*1024)) {
        return Number.parseFloat(num / (1024*1024*1024)).toFixed(1) + 'GiB';
    } else if (num >= (1024*1024)) {
        return Number.parseFloat(num / (1024*1024)).toFixed(1) + 'MiB';
    } else if (num >= 1024) {
        return Number.parseFloat(num / 1024).toFixed(1) + 'KiB';
    } else {
        return num + ' bytes';
    } 
}
function DriveUsage({capacity, used, onUpload, onUploadStart, onUploadProgress}) {
    const theme = useTheme().colors;
    const account = useContext(AccountContext);
    return <View style={{flexDirection: 'row', justifyContent: 'center'}}>
        <Text style={{flex: 1, color: theme.primary}}>Drive Capacity</Text>
        <Text style={{flex: 1, color: theme.text}}>{capacity ? humanFriendly(capacity) : 'unknown'}</Text>
        <Text style={{flex: 1, color: theme.primary}}>Used</Text>
        <Text style={{flex: 1, color: theme.text}}>{used ? humanFriendly(used) : 'unknown'}</Text>
        <Pressable onPress={ () => account.addFile(onUploadStart, onUploadProgress).then(
            (json) => { onUpload(json); }
        ).catch( (e) => Alert.alert(e)) }>
           <View style={{paddingRight: 10}}>
             <AntDesign name="upload" size={24} color={theme.text} />
           </View>
        </Pressable>
    </View>;
}

function useProgress() {
    const [state, setState] = useState(null);
    const [amountDone, setAmountDone] = useState(0);
    const [fileSize, setFileSize] = useState(null);

    return {
        start: (size) => {
            setFileSize(size);
        },
        setProgress:  (progress) => {
            console.log(progress);
            setAmountDone(progress);
        },
        percentage: () => {
            if (!fileSize) {
                return 0;
            }
            console.log('xxx', amountDone, fileSize);
            return (amountDone / fileSize) * 100;
        },
        status: () => {
            if (fileSize == null) {
                return 'unstarted';
            } else if (fileSize === amountDone) {
                return 'complete';
            }
            return 'in progress';
        },
        size: fileSize,
        amountDone: amountDone,
    }
}

function ProgressMeter({progress, labels}) {
    const theme = useTheme().colors;
    switch (progress.status()) {
    case 'unstarted':
        return <View />;
    case 'in progress':
        return <View style={{width: '80%'}}>
            <View style={{borderColor: theme.border, borderWidth: 2, flexDirection: 'row'}}>
                <View style={{width: progress.percentage() + '%', backgroundColor: theme.primary, height: 20}}></View>
                <View style={{width: (100 - progress.percentage()) + '%', backgroundColor: theme.card, height: 20}}></View>
            </View>
            <View style={{width: '100%', alignItems: 'center'}}>
                <Text style={{color: theme.text}}>
                    {progress.amountDone === 0 
                        ? labels.Starting
                        : (labels.Progressing + ' '
                            + humanFriendly(progress.amountDone)
                            + '(' + Number.parseFloat(progress.percentage()).toFixed(1) + '%)')
                    }
                </Text>
            </View>
        </View>;
    case 'complete':
        return <View style={{width: '80%'}}>
            <View style={{borderColor: theme.border, borderWidth: 2, flexDirection: 'row'}}>
                <View style={{width: '100%', backgroundColor: theme.primary, height: 20}}></View>
            </View>
            <View style={{width: '100%', alignItems: 'center'}}>
                <Text style={{color: theme.text}}>
                    {labels.Complete}
                </Text>
            </View>
        </View>
    default: throw new Error('Unhandled progress status');
    }
}
function UploadProgressMeter({progress}) {
    return <ProgressMeter progress={progress}
        labels={{
                'Starting': 'Starting upload...',
                'Progressing': 'Uploaded',
                'Complete' : 'Upload complete'
        }}/>;
}
function DownloadProgressMeter({progress}) {
    return <ProgressMeter progress={progress}
        labels={{
                'Starting': 'Starting download...',
                'Progressing': 'Downloaded',
                'Complete' : 'Download complete'
        }}/>;
}
function DisplayFile(file) {
    const theme = useTheme().colors;
    const api = useAPI();
    const progress = useProgress();
    const [showModal, setShowModal] = useState(false);

    const downloadFile = async (url, name) => {
        const albumName = "DaveKey";
        let lastNotification = null;
        try {
            const perm = await MediaLibrary.requestPermissionsAsync();
            if (perm.granted !== true) {
                Alert.alert('Missing permission', 'Missing device permission to save media locally.');
                return;
            }
        } catch (e) {
            return;
        }
        const download = FileSystem.createDownloadResumable(
            url,
            FileSystem.cacheDirectory + name,
            {},
            (downloadProgress) => {
                console.log('progress', downloadProgress, downloadProgress.totalBytesWritten);
                progress.setProgress(downloadProgress.totalBytesWritten);
            }
        );
        // ToastAndroid.show("Downloading " + name);
        progress.start(file.size);
        const downloadedFile = await download.downloadAsync(albumName);
        progress.setProgress(file.size);
        const album = await MediaLibrary.getAlbumAsync(albumName);
        const asset = await MediaLibrary.createAssetAsync(downloadedFile.uri);
        if (album == null) {
            await MediaLibrary.createAlbumAsync(albumName, asset, true);
        } else {
            await MediaLibrary.addAssetsToAlbumAsync([asset], album, true);
        }
    }
    return <View>
        <DescriptionModal show={showModal}
            originalDescription={file.comment}
            thumbnailUrl={file.thumbnailUrl}
            onClose={
                () => {
                  file.refresh();
                  setShowModal(false)
                }
            }
            fileid={file.id}
        />
        <Image
            height={200}
            resizeMode="contain"
            source={{uri: file.thumbnailUrl}}
        />
        <View style={{alignItems: 'center'}}>
            <Text style={{color: theme.primary}}>{file.name}</Text>
            <Text style={{color: theme.text}}>{file.comment}</Text>
            <DownloadProgressMeter progress={progress}/>
        </View>
        <View style={{flexDirection: 'row', justifyContent: 'space-between', paddingLeft: 20, paddingRight: 20}}>
            <View style={{flexDirection: 'row'}}>
                <Pressable
                    onPress={() => downloadFile(file.url, file.name)}>
                    <AntDesign style={{paddingRight: 25}} name="download" size={24} color={theme.text} />
                </Pressable>
                <Pressable
                    onPress={() => setShowModal(true) }>
                    <AntDesign name="edit" size={24} color={theme.text} />
                </Pressable>
            </View>
            <Pressable
                onPress={() => { 
                    console.log('Deleting', file.id);
                    api.call("drive/files/delete", { fileId: file.id}).then( () => {
                        // not actually a property of file, but was passed as a prop
                        file.refresh();
                    });
            }}>
                <AntDesign name="delete" size={24} color={theme.text} />
            </Pressable>
        </View>

    </View>;
}
function FileList({drive, files, reloadFiles}) {
    const theme = useTheme().colors;
    return (
        <FlatList
            data={files}
            renderItem={({item}) => <DisplayFile {...item} refresh={reloadFiles}/>}
            keyExtractor={(item) => item.id}
            ListFooterComponent={<Button title="Load more" onPress={drive.moreAfter} />}
            ItemSeparatorComponent={(e) => <View style={{borderBottomWidth: 2, borderColor: theme.border, borderStyle: 'dotted', margin: 20}} />}
        />
    );
}
export function DrivePage({navigation, route}) {
    const theme = useTheme().colors;
    const drive = useDrive();
    const upload = useProgress();
    const [forceReload, setForceReload] = useState(0); 
    return (<View style={{flex: 1}}>
        <View>
            <DriveUsage capacity={drive.usage.capacity} used={drive.usage.usage}
            onUploadStart={(name, size) => upload.start(size)}
            onUpload={
                async () => {
                    await drive.refresh();
                    setForceReload(forceReload+1)
                }
            }
            onUploadProgress={ (loaded, totalsize) => {
                console.log('loaded', loaded, totalsize);
                if (!upload.size) {
                    upload.start(totalsize);
                }
                upload.setProgress(loaded);
            }}
            />
        </View>
        <View style={{width: '100%', alignItems: 'center'}}>
            <UploadProgressMeter progress={upload}/>
        </View>
        <FileList drive={drive} files={drive.files} reloadFiles={
            async () => { 
                await drive.refresh();
                setForceReload(forceReload+1);
            }
        }/>
    </View>);
}

export function DescriptionModal({show, onClose, originalDescription, thumbnailUrl, fileid}) {
    const theme = useTheme().colors;
    const [content, setContent] = useState(originalDescription);
    const api = useAPI();
    const themeName = useColorScheme();
    return <Modal animationType="slide" style={{flex: 1}}
                visible={show}
                onRequestClose={() => onClose()}>
        <View style={{flex: 1, backgroundColor: theme.background}}>
            <View style={{flex: 1, flexDirection: 'column'}}>
                <Image
                    height={100}
                    resizeMode="contain"
                    source={{uri: thumbnailUrl}}
                />
                <ScrollView style={{flex: 2}}>
                    <MFM style={{flex: 2}} text={content} />
                </ScrollView>
                <TextInput multiline={true} 
                    style={{flex: 6, padding: 2, margin: 2, borderColor: theme.border, borderWidth: 2, textAlignVertical: 'top', color: theme.text}}
                    autoFocus={true}
                    value={content}
                    onChangeText={setContent}
                    placeholder="Describe this magnificent file."
                    placeholderTextColor={themeName == "dark" ? "#777": "#999"} />

                <View style={{flex: 1, flexDirection: 'row', alignContent: 'stretch', borderWidth: 3}}>
                      <View style={{flex: 1, padding: 3}}><Button style={{flex: 1}} title="Update" onPress={() => {
                          api.call("drive/files/update", {
                              fileId: fileid,
                              comment: content,
                          });
                          onClose();
                      }} /></View>
                      <View style={{flex: 1, padding: 3}}><Button style={{flex: 1}} title="Cancel" onPress={() => {
                          onClose();
                      }} /></View>
                </View>
            </View>
        </View>
    </Modal>;
}
