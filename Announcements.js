import { StyleSheet, Text, View } from 'react-native';

function Announcement(props) {
    return (
      <View>
        <View>
          <Text style={styles.header}>{props.title}</Text>
          <Text>{props.datetime}</Text>
        </View>
        <Text>{props.text}</Text>
      </View>
    );
}
export function DisplayAnnouncements(props) {
    return (
      <View style={styles.container}>
        {props.announcements.map((a) => {
            return <Announcement title={a.title}
                key={a.id}
                text={a.text}
                image={a.imageUrl}
                datetime={a.updatedAt}
                />
            })
        }
      </View>
    );
}

 // const getAnnouncements = () => {
  //    fetch('https://' + instance + "/api/announcements",
   //   {
    //      method: 'POST',
     //     headers: {
      //        Accept: 'application/json',
      //    },
   //   }).then((resp) => resp.json())
    //  .then((json) => {
     //   setAnnouncements(json);
    //  })
   //   .catch((error) => console.log(error));
 // };
// }

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    flexFlow: 'space-between',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    width: '100%',
  },
  mainContainer: {
    flex: 1,
    backgroundColor: '#fff',
    flexFlow: 'space-between',
    flexDirection: 'column',
    width: '100%',
  },
  header: {
    fontWeight: 'bold',
    fontSize: 20,
  },
  instanceLabel: {
    backgroundColor: '#fff',
    alignItems: 'center',
    fontWeight: 'bold',
    fontSize: 20,
    textAlign: 'center',
    width: '80%',
  },
  instanceInput: {
    borderStyle: 'solid',
    borderColor: 'black',
    borderWidth: 1,
    marginTop: 10,
    width: '80%',
    padding: 5,
  },
  loginButton: {
    width: '80%',
    marginTop: 10,
  },
  post: {
    flex: 1,
    color: '#000',
    backgroundColor: '#eee',
  },
  postContainer: {
    flex: 1,
    color: '#000',
    backgroundColor: '#eee',
    borderColor: 'black',
    borderStyle: 'solid',
    borderWidth: 1,
    padding: 10,
  },
  postMetaContainer: {
    flex: 1,
    color: '#000',
    backgroundColor: '#eee',
    padding: 10,
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
  },
  flipped: {
      transform: [{scaleX: -1}],
  },
  postTime: {
      flex: 1,
  },
  postAuthor: {
      flex: 4,
  },
  flexer: {
      flex: 1,
  }
});
