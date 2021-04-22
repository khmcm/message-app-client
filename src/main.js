import {createWebHashHistory, createRouter} from 'vue-router'
import { createApp } from 'vue'
import {
    Button as VantButton,
    Overlay as VantOverlay,
    Loading as VantLoading,
    Col as VantCol,
    Row as VantRow,
    Popup as VantPopup,
    Field as VantField,
    NavBar as VantNavBar,
    List as VantList,
    Cell as VantCell,
    Slider as VantSlider,
    Checkbox as VantCheckbox,
    Icon as VantIcon,
    Switch as VantSwitch,
    ActionSheet as VantActionSheet,
    Tabbar as VantTabbar,
    TabbarItem as VantTabbarItem
} from 'vant'
import store from '@/store.js'
import 'vant/lib/index.css'

import SignupRoute from '@/routes/SignupRoute.vue'
import QRCodeLoginRoute from '@/routes/QRCodeLoginRoute.vue'
import HomeRoute from '@/routes/HomeRoute.vue'

/* eslint-disable */
import ChatRoute from '@/routes/ChatRoute.vue'
import ContactsRoute from '@/routes/ContactsRoute.vue'
import SettingsRoute from '@/routes/SettingsRoute.vue'

import App from '@/App.vue'

const router = new createRouter({
    routes: [
        {path: '/signup', component: SignupRoute, name: 'SignupRoute'},
        {path: '/qrcodelogin', component: QRCodeLoginRoute, name: 'QRCodeLoginRoute'},
        {path: '/', component: HomeRoute, name: 'HomeRoute'},
        {path: '/settings', component: SettingsRoute, name: 'SettingsRoute'},
        {path: '/chat/:publicSigningKey', component: ChatRoute, name: 'ChatRoute'},
        {path: '/contacts', component: ContactsRoute, name: 'ContactsRoute'}
    ],
    history: createWebHashHistory()
});

const use = [
    VantButton,
    VantOverlay,
    VantLoading,
    VantCol,
    VantRow,
    VantPopup,
    VantField,
    VantNavBar,
    VantList,
    VantCell,
    VantSlider,
    VantCheckbox,
    VantIcon,
    VantSwitch,
    VantActionSheet,
    VantTabbar,
    VantTabbarItem,
    router,
    store
];

const app = createApp(App);

use.forEach((entry) => {
    app.use(entry);
});

app.mount('#app');
