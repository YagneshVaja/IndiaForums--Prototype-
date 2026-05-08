import React, { useMemo, useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import type { CelebrityBiography } from '../../../services/api';
import { parseBioHtml, joinList, formatDateString, computeAge, type BioImage } from '../utils/parseBioHtml';
import StatsBar from './StatsBar';
import AboutCard from './AboutCard';
import BioSection from './BioSection';
import FactsCard from './FactsCard';
import SocialMediaCard from './SocialMediaCard';
import BioSkeleton from './BioSkeleton';
import ErrorBlock from './ErrorBlock';
import ImageLightbox from './ImageLightbox';

interface Props {
  biography: CelebrityBiography | null | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

export default function BiographyTab({ biography, isLoading, isError, onRetry }: Props) {
  const sections = useMemo(() => parseBioHtml(biography?.bioHtml || ''), [biography?.bioHtml]);
  const [lightbox, setLightbox] = useState<{ images: BioImage[]; index: number } | null>(null);

  if (isLoading) return <BioSkeleton />;
  if (isError)   return <ErrorBlock message="Couldn't load biography" onRetry={onRetry} />;
  if (!biography) return <ErrorBlock message="No biography available" />;

  const hasSections = sections.length > 0;

  return (
    <>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <StatsBar biography={biography} />

        {!!biography.shortDesc && <AboutCard text={biography.shortDesc} />}

        {hasSections ? (
          <View>
            {sections.map((s, i) => (
              <BioSection
                key={i}
                section={s}
                onImagePress={(images, index) => setLightbox({ images, index })}
              />
            ))}
          </View>
        ) : (
          <View>
            <FactsCard
              title="Personal Info"
              icon="👤"
              items={[
                biography.profession.length > 0 ? { label: 'Profession', value: joinList(biography.profession) } : null,
                biography.nicknames.length > 0  ? { label: 'Nicknames',  value: joinList(biography.nicknames)  } : null,
                biography.birthDate ? {
                  label: 'Date of Birth',
                  value: (() => {
                    const dob = formatDateString(biography.birthDate);
                    const age = computeAge(biography.birthDate);
                    return age != null ? `${dob} · Age ${age}` : dob;
                  })(),
                } : null,
                biography.birthPlace   ? { label: 'Birthplace',    value: biography.birthPlace   } : null,
                biography.zodiacSign   ? { label: 'Zodiac Sign',   value: biography.zodiacSign   } : null,
                biography.nationality  ? { label: 'Nationality',   value: biography.nationality  } : null,
                biography.hometown     ? { label: 'Hometown',      value: biography.hometown     } : null,
                biography.religion     ? { label: 'Religion',      value: biography.religion     } : null,
              ]}
            />
            <FactsCard
              title="Physical"
              icon="📏"
              items={[
                biography.height    ? { label: 'Height',     value: biography.height }    : null,
                biography.weight    ? { label: 'Weight',     value: biography.weight }    : null,
                biography.chest     ? { label: 'Chest',      value: biography.chest }     : null,
                biography.waist     ? { label: 'Waist',      value: biography.waist }     : null,
                biography.biceps    ? { label: 'Biceps',     value: biography.biceps }    : null,
                biography.eyeColor  ? { label: 'Eye Color',  value: biography.eyeColor }  : null,
                biography.hairColor ? { label: 'Hair Color', value: biography.hairColor } : null,
              ]}
            />
            <FactsCard
              title="Career"
              icon="🎬"
              items={[
                biography.education ? { label: 'Qualification', value: biography.education } : null,
                biography.debut.length > 0 ? { label: 'Debut', value: joinList(biography.debut) } : null,
                biography.netWorth  ? { label: 'Net Worth', value: biography.netWorth } : null,
              ]}
            />
            <FactsCard
              title="Family"
              icon="👨‍👩‍👧‍👦"
              items={[
                biography.maritalStatus  ? { label: 'Status',   value: biography.maritalStatus } : null,
                biography.spouse.length > 0   ? { label: 'Spouse',   value: joinList(biography.spouse)   } : null,
                biography.children.length > 0 ? { label: 'Children', value: joinList(biography.children) } : null,
                biography.parents.length > 0  ? { label: 'Parents',  value: joinList(biography.parents)  } : null,
                biography.siblings.length > 0 ? { label: 'Siblings', value: joinList(biography.siblings) } : null,
              ]}
            />
            <FactsCard
              title="Favorites"
              icon="❤️"
              items={[
                biography.favFilms.length > 0  ? { label: 'Films',  value: joinList(biography.favFilms)  } : null,
                biography.favActors.length > 0 ? { label: 'Actors', value: joinList(biography.favActors) } : null,
                biography.favFood.length > 0   ? { label: 'Food',   value: joinList(biography.favFood)   } : null,
                biography.hobbies.length > 0   ? { label: 'Hobbies',value: joinList(biography.hobbies)   } : null,
              ]}
            />
            <FactsCard
              title="Awards"
              icon="🏆"
              items={[
                biography.awards.length > 0 ? { label: 'Honours', value: joinList(biography.awards) } : null,
              ]}
            />
          </View>
        )}

        <SocialMediaCard biography={biography} />

        <View style={styles.spacer} />
      </ScrollView>

      {lightbox && (
        <ImageLightbox
          images={lightbox.images}
          startIndex={lightbox.index}
          onClose={() => setLightbox(null)}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  scroll:  { flex: 1 },
  content: { paddingBottom: 16 },
  spacer:  { height: 32 },
});
