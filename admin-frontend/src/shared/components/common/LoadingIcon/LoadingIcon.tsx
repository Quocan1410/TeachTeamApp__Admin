import { ArrowPathIcon } from "@heroicons/react/24/outline";
import styles from "./LoadingIcon.module.css";

export default function LoadingIcon({ size = 20 }: { size?: number }) {
    return (
        <ArrowPathIcon
            className={styles.icon}
            style={{ width: size, height: size }}
            aria-hidden
        />
    );
}
