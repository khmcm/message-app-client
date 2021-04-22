/**
 * Returns the index for the route in the
 * bottom navigation bar
 * @returns {number}
 */
export default function getCurrentRouteNavIndex() {
    return (["/","/contacts","/settings"]).indexOf(this.$router.currentRoute._value.path);
}