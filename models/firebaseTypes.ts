import {FirebaseAuthTypes} from '@react-native-firebase/auth'
import {FirebaseFirestoreTypes} from '@react-native-firebase/firestore'

export type User = FirebaseAuthTypes.User
export type AuthCredential = FirebaseAuthTypes.AuthCredential

export type CollectionReference<T extends DocumentData> = FirebaseFirestoreTypes.CollectionReference<T>
export type DocumentData = FirebaseFirestoreTypes.DocumentData
export type QuerySnapshot<T extends DocumentData> = FirebaseFirestoreTypes.QuerySnapshot<T>
export type DocumentReference<T extends DocumentData> = FirebaseFirestoreTypes.DocumentReference<T>
export type DocumentSnapshot<T extends DocumentData> = FirebaseFirestoreTypes.DocumentSnapshot<T>