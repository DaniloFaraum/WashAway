import Ionicons from '@expo/vector-icons/Ionicons';
import { Link } from 'expo-router';
import {
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ImageSourcePropType,
} from 'react-native';

import { colors } from '@/constants/colors';

export type CarWashCardProps = {
  id: string;
  name: string;
  rating: number;
  reviewsCount: number;
  distance: string;
  time: string;
  price: number;
  isOpen: boolean;
  image: ImageSourcePropType;
  rank: number;
};

function formatPrice(price: number) {
  return price.toFixed(2).replace('.', ',');
}

export function CarWashCard({
  id,
  name,
  rating,
  reviewsCount,
  distance,
  time,
  price,
  isOpen,
  image,
  rank,
}: CarWashCardProps) {
  return (
    <Link
      href={{
        pathname: '/servicos',
        params: { id, nome: name },
      }}
      asChild>
      <TouchableOpacity style={styles.card} activeOpacity={0.7}>
        <View style={styles.photoWrap}>
          <Image source={image} style={styles.photo} resizeMode="cover" />
          <View style={styles.rankBadge}>
            <Text style={styles.rankText}>{rank}</Text>
          </View>
        </View>

        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>

          <View style={styles.ratingRow}>
            <Ionicons name="star" size={14} color={colors.star} />
            <Text style={styles.rating}>{rating.toFixed(1)}</Text>
            <Text style={styles.reviews}>({reviewsCount})</Text>
          </View>

          <Text style={styles.meta}>
            {distance} • {time}
          </Text>

          <Text style={styles.price}>A partir de R$ {formatPrice(price)}</Text>

          <View style={[styles.statusBadge, isOpen ? styles.statusOpen : styles.statusClosed]}>
            <Text style={styles.statusText}>{isOpen ? 'ABERTO' : 'FECHADO'}</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 12,
    gap: 14,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.08)',
      },
      default: {
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
      },
    }),
  },
  photoWrap: {
    width: 100,
    height: 100,
  },
  photo: {
    width: 100,
    height: 100,
    borderRadius: 16,
  },
  rankBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  info: {
    flex: 1,
    justifyContent: 'space-between',
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.black,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rating: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.black,
  },
  reviews: {
    fontSize: 13,
    color: colors.neutralGray,
  },
  meta: {
    fontSize: 13,
    color: colors.neutralGray,
  },
  price: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusOpen: {
    backgroundColor: colors.success,
  },
  statusClosed: {
    backgroundColor: colors.danger,
  },
  statusText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
});
